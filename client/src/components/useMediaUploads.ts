import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import type { FileRejection } from 'react-dropzone';
import { api, errorMessage, uploadMedia } from '../lib/api';
import type { Media } from '../lib/types';

export const MAX_UPLOAD_MB = 10;

export const ACCEPTED_FILES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'audio/mpeg': ['.mp3'],
};

export interface Upload {
  key: number;
  name: string;
  /** Da 0 a 1. */
  progress: number;
  error?: string;
}

/** Caricamenti in corso e contenuti allegati alla pagina che si sta scrivendo. */
export function useMediaUploads(setItems: Dispatch<SetStateAction<Media[]>>, onBusyChange: (busy: boolean) => void) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const nextKey = useRef(0);
  // Allegati in questa sessione di scrittura: se li togli prima di salvare vanno eliminati subito.
  const fresh = useRef(new Set<string>());

  const busy = uploads.some((u) => !u.error);
  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);

  const patch = (key: number, change: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...change } : u)));
  const dismissUpload = useCallback((key: number) => setUploads((list) => list.filter((u) => u.key !== key)), []);

  const attach = useCallback(
    (media: Media) => {
      fresh.current.add(media.id);
      setItems((list) => [...list, media]);
    },
    [setItems],
  );

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const refused: Upload[] = rejected.map(({ file, errors }) => ({
        key: ++nextKey.current,
        name: file.name,
        progress: 0,
        error: errors.some((e) => e.code === 'file-too-large')
          ? `Supera i ${MAX_UPLOAD_MB} MB: prova con una versione più leggera.`
          : 'Questo tipo di file non entra nel libro.',
      }));
      const started = accepted.map((file) => ({ file, upload: { key: ++nextKey.current, name: file.name, progress: 0 } }));
      setUploads((list) => [...list, ...refused, ...started.map((s) => s.upload)]);

      for (const { file, upload } of started) {
        uploadMedia(file, (progress) => patch(upload.key, { progress })).then(
          (media) => {
            attach(media);
            dismissUpload(upload.key);
          },
          (err) => patch(upload.key, { error: errorMessage(err) }),
        );
      }
    },
    [attach, dismissUpload],
  );

  /** Aggiunge un link (Spotify, YouTube, GIF). Restituisce un messaggio se qualcosa non va. */
  const addLink = useCallback(
    async (url: string): Promise<string | null> => {
      try {
        const { media } = await api<{ media: Media }>('/media/embed', { body: { url } });
        attach(media);
        return null;
      } catch (err) {
        return errorMessage(err);
      }
    },
    [attach],
  );

  const remove = useCallback(
    (media: Media) => {
      setItems((list) => list.filter((m) => m.id !== media.id));
      if (fresh.current.delete(media.id)) api(`/media/${media.id}`, { method: 'DELETE' }).catch(() => {});
    },
    [setItems],
  );

  return { uploads, dismissUpload, onDrop, addLink, remove };
}
