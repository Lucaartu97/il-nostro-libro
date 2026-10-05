import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { bookIdFromCookieHeader } from '../lib/auth.js';

type Person = { author: string; clientId: string };
type Lock = Person & { bookId: string; entryId: string; socketId: string; expiresAt: number };

const LOCK_TTL_MS = 45_000;
const UUID = /^[0-9a-f-]{36}$/i;

let io: Server | null = null;
// I lock vivono in memoria: la app gira come singola istanza (vedi README).
const locks = new Map<string, Lock>();

const room = (bookId: string) => `libro:${bookId}`;
const lockKey = (bookId: string, entryId: string) => `${bookId}:${entryId}`;

/** Avvisa chi ha il libro aperto (REST → realtime). */
export function broadcast(bookId: string, event: string, payload: unknown): void {
  io?.to(room(bookId)).emit(event, payload);
}

/** Chi sta modificando la pagina, se qualcuno la tiene aperta nell'editor. */
export function activeLock(bookId: string, entryId: string): Lock | null {
  const key = lockKey(bookId, entryId);
  const lock = locks.get(key);
  if (!lock) return null;
  if (lock.expiresAt < Date.now()) {
    locks.delete(key);
    return null;
  }
  return lock;
}

function releaseLock(lock: Lock): void {
  locks.delete(lockKey(lock.bookId, lock.entryId));
  broadcast(lock.bookId, 'lock:changed', { entryId: lock.entryId, author: null, clientId: null });
}

async function emitPresence(bookId: string): Promise<void> {
  if (!io) return;
  const sockets = await io.in(room(bookId)).fetchSockets();
  const people = sockets.map((s) => s.data.person as Person);
  io.to(room(bookId)).emit('presence', { people });
}

function onConnection(socket: Socket): void {
  const bookId = socket.data.bookId as string;
  const person = socket.data.person as Person;
  void socket.join(room(bookId));
  void emitPresence(bookId);

  socket.on('writing', (msg: { entryId?: unknown; active?: unknown }) => {
    socket.to(room(bookId)).emit('partner:writing', {
      ...person,
      entryId: typeof msg?.entryId === 'string' && UUID.test(msg.entryId) ? msg.entryId : null,
      active: Boolean(msg?.active),
    });
  });

  socket.on('lock:acquire', (entryId: unknown, ack?: (res: unknown) => void) => {
    if (typeof entryId !== 'string' || !UUID.test(entryId)) return ack?.({ ok: false });
    const held = activeLock(bookId, entryId);
    if (held && held.clientId !== person.clientId) {
      return ack?.({ ok: false, author: held.author });
    }
    locks.set(lockKey(bookId, entryId), {
      ...person,
      bookId,
      entryId,
      socketId: socket.id,
      expiresAt: Date.now() + LOCK_TTL_MS,
    });
    socket.to(room(bookId)).emit('lock:changed', { entryId, ...person });
    ack?.({ ok: true });
  });

  socket.on('lock:heartbeat', (entryId: unknown) => {
    if (typeof entryId !== 'string') return;
    const held = activeLock(bookId, entryId);
    if (held && held.clientId === person.clientId) held.expiresAt = Date.now() + LOCK_TTL_MS;
  });

  socket.on('lock:release', (entryId: unknown) => {
    if (typeof entryId !== 'string') return;
    const held = activeLock(bookId, entryId);
    if (held && held.clientId === person.clientId) releaseLock(held);
  });

  socket.on('disconnect', () => {
    for (const lock of locks.values()) {
      if (lock.socketId === socket.id) releaseLock(lock);
    }
    socket.to(room(bookId)).emit('partner:writing', { ...person, entryId: null, active: false });
    void emitPresence(bookId);
  });
}

export function initRealtime(server: HttpServer): Server {
  io = new Server(server, { serveClient: false });

  io.use((socket, next) => {
    const bookId = bookIdFromCookieHeader(socket.handshake.headers.cookie);
    const { author, clientId } = socket.handshake.auth as Partial<Person>;
    if (!bookId || typeof author !== 'string' || typeof clientId !== 'string') {
      next(new Error('non autorizzato'));
      return;
    }
    socket.data.bookId = bookId;
    socket.data.person = { author: author.slice(0, 40), clientId: clientId.slice(0, 64) };
    next();
  });
  io.on('connection', onConnection);

  // Un editor chiuso male (rete caduta, telefono in tasca) non deve bloccare la pagina per sempre.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const lock of locks.values()) {
      if (lock.expiresAt < now) releaseLock(lock);
    }
  }, 15_000);
  sweep.unref();

  return io;
}
