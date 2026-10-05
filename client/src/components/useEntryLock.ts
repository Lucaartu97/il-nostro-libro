import { useEffect, useState } from 'react';
import { useLive } from '../context/Live';

type LockReply = { ok: boolean; author?: string };

/**
 * Mentre l’editor è aperto: fa sapere al partner che stiamo scrivendo e, per una pagina
 * esistente, la riserva. Restituisce il nome di chi la sta già modificando (o null).
 */
export function useEntryLock(entryId: string | undefined): string | null {
  const { socket } = useLive();
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    let alive = true;

    const acquire = async () => {
      if (!entryId) return;
      try {
        const reply: LockReply = await socket.timeout(5000).emitWithAck('lock:acquire', entryId);
        if (alive) setLockedBy(reply.ok ? null : (reply.author ?? 'Il tuo partner'));
      } catch {
        // Senza connessione si scrive lo stesso: al salvataggio decide il server.
      }
    };
    const start = () => {
      socket.emit('writing', { entryId: entryId ?? null, active: true });
      void acquire();
    };
    const onLockChanged = (msg: { entryId: string; author: string | null }) => {
      // Il partner ha finito: la pagina è di nuovo libera, proviamo a prenderla.
      if (msg.entryId === entryId && msg.author === null) void acquire();
    };

    start();
    socket.on('connect', start);
    socket.on('lock:changed', onLockChanged);
    const heartbeat = setInterval(() => entryId && socket.emit('lock:heartbeat', entryId), 15_000);

    return () => {
      alive = false;
      clearInterval(heartbeat);
      socket.off('connect', start);
      socket.off('lock:changed', onLockChanged);
      if (entryId) socket.emit('lock:release', entryId);
      socket.emit('writing', { entryId: entryId ?? null, active: false });
    };
  }, [socket, entryId]);

  return lockedBy;
}
