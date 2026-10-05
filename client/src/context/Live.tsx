import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../lib/api';
import { clientId } from '../lib/device';
import type { Book, Entry, Person } from '../lib/types';
import { useSession } from './Session';

export interface Toast {
  id: number;
  text: string;
  /** Se presente, il toast porta alla pagina. */
  entryId?: string;
}

interface LiveValue {
  /** null finché le pagine non sono arrivate. */
  entries: Entry[] | null;
  upsertEntry: (entry: Entry) => void;
  removeEntry: (id: string) => void;
  socket: Socket | null;
  /** Il partner ha il libro aperto in questo momento? */
  partnerOnline: boolean;
  /** Il partner sta scrivendo (entryId null = una pagina nuova). */
  partnerWriting: { entryId: string | null } | null;
  toasts: Toast[];
  notify: (text: string, entryId?: string) => void;
  dismissToast: (id: number) => void;
}

const LiveContext = createContext<LiveValue | null>(null);

const byBookOrder = (a: Entry, b: Entry) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

type EntryEvent = { entry: Entry; byClientId: string | null; quiet?: boolean };

export function LiveProvider({ children }: { children: ReactNode }) {
  const { book, author, partner, openBook } = useSession();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerWriting, setPartnerWriting] = useState<{ entryId: string | null } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((text: string, entryId?: string) => {
    toastId.current += 1;
    const toast = { id: toastId.current, text, entryId };
    setToasts((list) => [...list.slice(-2), toast]);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const upsertEntry = useCallback((entry: Entry) => {
    setEntries((list) => [...(list ?? []).filter((e) => e.id !== entry.id), entry].sort(byBookOrder));
  }, []);
  const removeEntry = useCallback((id: string) => {
    setEntries((list) => (list ? list.filter((e) => e.id !== id) : list));
  }, []);

  const bookId = book?.id;
  const reload = useCallback(async () => {
    const data = await api<{ entries: Entry[] }>('/entries');
    setEntries(data.entries);
  }, []);

  useEffect(() => {
    setEntries(null);
    if (bookId) reload().catch(() => setEntries([]));
  }, [bookId, reload]);

  // Il nome del partner serve solo ai messaggi: non deve far ripartire la connessione.
  const partnerName = useRef(partner);
  partnerName.current = partner;

  useEffect(() => {
    if (!bookId || !author) return;
    const s = io({ auth: { author, clientId } });
    const mine = (id: string | null) => id === clientId;
    let connectedBefore = false;

    s.on('connect', () => {
      // Dopo una riconnessione recuperiamo ciò che potremmo aver perso.
      if (connectedBefore) reload().catch(() => {});
      connectedBefore = true;
    });
    s.on('presence', ({ people }: { people: Person[] }) => {
      setPartnerOnline(people.some((p) => !mine(p.clientId)));
    });
    s.on('partner:writing', (msg: Person & { entryId: string | null; active: boolean }) => {
      if (!mine(msg.clientId)) setPartnerWriting(msg.active ? { entryId: msg.entryId } : null);
    });
    s.on('entry:created', ({ entry, byClientId }: EntryEvent) => {
      upsertEntry(entry);
      if (!mine(byClientId)) notify(`${partnerName.current} ha appena scritto una pagina: «${entry.title}»`, entry.id);
    });
    s.on('entry:updated', ({ entry, byClientId, quiet }: EntryEvent) => {
      upsertEntry(entry);
      if (!mine(byClientId) && !quiet) notify(`${partnerName.current} ha ritoccato «${entry.title}»`, entry.id);
    });
    s.on('entry:deleted', ({ entryId }: { entryId: string }) => removeEntry(entryId));
    s.on('book:updated', ({ book }: { book: Book }) => openBook(book));
    s.on('disconnect', () => {
      setPartnerOnline(false);
      setPartnerWriting(null);
    });

    setSocket(s);
    return () => {
      s.close();
      setSocket(null);
      setPartnerOnline(false);
      setPartnerWriting(null);
    };
  }, [bookId, author, reload, upsertEntry, removeEntry, notify, openBook]);

  const value = useMemo<LiveValue>(
    () => ({ entries, upsertEntry, removeEntry, socket, partnerOnline, partnerWriting, toasts, notify, dismissToast }),
    [entries, upsertEntry, removeEntry, socket, partnerOnline, partnerWriting, toasts, notify, dismissToast],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveValue {
  const value = useContext(LiveContext);
  if (!value) throw new Error('useLive va usato dentro LiveProvider');
  return value;
}
