import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { requireBook } from '../lib/auth.js';
import { parseEmbed } from '../lib/embeds.js';
import { idParam, type MediaRow, removeFiles, toMedia } from '../lib/entry.js';
import { HttpError } from '../lib/errors.js';
import { sniffFile } from '../lib/sniff.js';

const MEDIA_COLUMNS = 'id, kind, file_name, original_name, mime, external_ref, caption';
const UNSUPPORTED =
  'Questo tipo di file non entra nel libro. Potete aggiungere foto (JPG, PNG, WEBP), GIF, video MP4 e canzoni MP3.';

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(config.uploadDir, req.bookId);
      fs.mkdir(dir, { recursive: true }).then(
        () => cb(null, dir),
        (err: Error) => cb(err, dir),
      );
    },
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.tmp`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

export const mediaRouter = Router();
mediaRouter.use(requireBook);

mediaRouter.post('/media', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) throw new HttpError(400, 'Nessun file ricevuto.');

  // Il tipo si decide dal contenuto reale, non dal nome o dal MIME dichiarato dal browser.
  const detected = await sniffFile(file.path);
  if (!detected) {
    await fs.rm(file.path, { force: true });
    throw new HttpError(415, UNSUPPORTED);
  }
  const fileName = `${path.basename(file.filename, '.tmp')}.${detected.ext}`;
  await fs.rename(file.path, path.join(file.destination, fileName));

  // multer legge i nomi come latin1: li riportiamo a UTF-8 (accenti, emoji).
  const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 200);
  const [row] = await query<MediaRow>(
    `INSERT INTO media (book_id, kind, file_name, original_name, mime, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${MEDIA_COLUMNS}`,
    [req.bookId, detected.kind, fileName, originalName, detected.mime, file.size],
  );
  res.status(201).json({ media: toMedia(row as MediaRow) });
});

mediaRouter.post('/media/embed', async (req, res) => {
  const { url } = z.object({ url: z.string('Incolla un link.').trim().max(500) }).parse(req.body);
  const embed = parseEmbed(url);
  if (!embed) {
    throw new HttpError(
      400,
      'Non riconosco questo link. Funzionano i link di YouTube, Spotify e le GIF di Giphy o Tenor.',
    );
  }
  const [row] = await query<MediaRow>(
    `INSERT INTO media (book_id, kind, external_ref) VALUES ($1, $2, $3) RETURNING ${MEDIA_COLUMNS}`,
    [req.bookId, embed.kind, embed.externalRef],
  );
  res.status(201).json({ media: toMedia(row as MediaRow) });
});

mediaRouter.get('/media/:id/file', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const [row] = await query<MediaRow>(
    `SELECT ${MEDIA_COLUMNS} FROM media WHERE id = $1 AND book_id = $2 AND file_name IS NOT NULL`,
    [id, req.bookId],
  );
  if (!row?.file_name) throw new HttpError(404, 'Questo ricordo non è più nel libro.');

  res.sendFile(row.file_name, {
    root: path.join(config.uploadDir, req.bookId),
    headers: {
      'Content-Type': row.mime ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

// Solo per i contenuti non ancora legati a una pagina (upload annullato nell'editor).
mediaRouter.delete('/media/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const rows = await query<{ file_name: string | null }>(
    'DELETE FROM media WHERE id = $1 AND book_id = $2 AND entry_id IS NULL AND NOT on_cover RETURNING file_name',
    [id, req.bookId],
  );
  await removeFiles(
    req.bookId,
    rows.map((r) => r.file_name),
  );
  res.status(204).end();
});

/** Elimina i caricamenti rimasti senza pagina (editor chiuso senza salvare). */
export async function cleanOrphanMedia(): Promise<number> {
  const rows = await query<{ book_id: string; file_name: string | null }>(
    `DELETE FROM media
      WHERE entry_id IS NULL AND NOT on_cover AND created_at < now() - interval '24 hours'
      RETURNING book_id, file_name`,
  );
  await Promise.all(rows.map((r) => removeFiles(r.book_id, [r.file_name])));
  return rows.length;
}
