import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { initRealtime } from '../src/realtime/hub.js';
import { bookData, entryData, uniqueCode } from './helpers.js';

const app = createApp();
const server = http.createServer(app);
const io = initRealtime(server);
let url = '';
const sockets: Socket[] = [];

beforeAll(async () => {
  await migrate();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  sockets.forEach((s) => s.close());
  await io.close();
  await pool.end();
});

function join(cookie: string, author: string, clientId: string): Promise<Socket> {
  const socket = connect(url, { transports: ['websocket'], extraHeaders: { cookie }, auth: { author, clientId } });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

const next = <T>(socket: Socket, event: string) => new Promise<T>((resolve) => socket.once(event, resolve));

describe('scrivere in due', () => {
  it('non lascia entrare chi non ha il codice', async () => {
    await expect(join('', 'Anna', 'a')).rejects.toThrow();
  });

  it('avvisa il partner e protegge la pagina che sta scrivendo', async () => {
    const created = await request(url).post('/api/books').send(bookData(uniqueCode()));
    const cookie = String(created.headers['set-cookie']).split(';')[0] ?? '';
    const api = (clientId: string) => ({
      post: (path: string) => request(url).post(path).set('Cookie', cookie).set('x-client-id', clientId),
      put: (path: string) => request(url).put(path).set('Cookie', cookie).set('x-client-id', clientId),
    });

    const anna = await join(cookie, 'Anna', 'telefono-anna');
    const presence = next<{ people: { author: string }[] }>(anna, 'presence');
    const marco = await join(cookie, 'Marco', 'telefono-marco');
    expect((await presence).people.map((p) => p.author).sort()).toEqual(['Anna', 'Marco']);

    // Una nuova pagina di Anna arriva subito a Marco.
    const announced = next<{ entry: { id: string; title: string }; byClientId: string }>(marco, 'entry:created');
    const { body } = await api('telefono-anna').post('/api/entries').send(entryData());
    expect(await announced).toMatchObject({ entry: { title: 'San Valentino' }, byClientId: 'telefono-anna' });
    const entryId: string = body.entry.id;

    // Anna apre la pagina in modifica: Marco non può sovrascriverla.
    const lockSeen = next<{ entryId: string; author: string }>(marco, 'lock:changed');
    expect(await anna.emitWithAck('lock:acquire', entryId)).toEqual({ ok: true });
    expect(await lockSeen).toMatchObject({ entryId, author: 'Anna' });
    expect(await marco.emitWithAck('lock:acquire', entryId)).toEqual({ ok: false, author: 'Anna' });

    const blocked = await api('telefono-marco').put(`/api/entries/${entryId}`).send(entryData({ title: 'Mia!' }));
    expect(blocked.status).toBe(423);
    expect(blocked.body.lockedBy).toBe('Anna');
    await api('telefono-anna').put(`/api/entries/${entryId}`).send(entryData({ title: 'Nostra' })).expect(200);

    // Quando Anna chiude (o perde la connessione) la pagina torna libera.
    const released = next<{ entryId: string; author: string | null }>(marco, 'lock:changed');
    anna.close();
    expect(await released).toEqual({ entryId, author: null, clientId: null });
    expect(await marco.emitWithAck('lock:acquire', entryId)).toEqual({ ok: true });
    await api('telefono-marco').put(`/api/entries/${entryId}`).send(entryData({ title: 'Mia!' })).expect(200);
  });
});
