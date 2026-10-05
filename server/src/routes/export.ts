import path from 'node:path';
import { ZipArchive } from 'archiver';
import { Router } from 'express';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { requireBook } from '../lib/auth.js';
import { loadBook, toBook } from '../lib/book.js';
import { ENTRY_SELECT, type EntryRow, toEntry } from '../lib/entry.js';

async function snapshot(bookId: string) {
  const book = toBook(await loadBook(bookId));
  const rows = await query<EntryRow>(
    `${ENTRY_SELECT} WHERE e.book_id = $1 ORDER BY e.entry_date, e.created_at`,
    [bookId],
  );
  return { rows, data: { exportedAt: new Date().toISOString(), book, entries: rows.map(toEntry) } };
}

const stamp = () => new Date().toISOString().slice(0, 10);

export const exportRouter = Router();
exportRouter.use(requireBook);

/** Tutte le pagine in un unico file JSON. */
exportRouter.get('/export/json', async (req, res) => {
  const { data } = await snapshot(req.bookId);
  res.attachment(`il-nostro-libro-${stamp()}.json`).json(data);
});

/** Copia completa: libro.json + tutti i file caricati (pagine e copertina), in uno ZIP. */
exportRouter.get('/export/zip', async (req, res) => {
  const { rows, data } = await snapshot(req.bookId);
  const fileNames = rows.flatMap((entry) => entry.media.map((m) => m.file_name)).filter((f) => f !== null);

  const coverFiles = await query<{ file_name: string }>(
    'SELECT file_name FROM media WHERE book_id = $1 AND on_cover AND file_name IS NOT NULL',
    [req.bookId],
  );
  fileNames.push(...coverFiles.map((r) => r.file_name));

  res.attachment(`il-nostro-libro-${stamp()}.zip`);
  // Foto e video sono già compressi: basta impacchettarli.
  const zip = new ZipArchive({ store: true });
  zip.on('error', (err) => res.destroy(err));
  zip.pipe(res);
  zip.append(JSON.stringify(data, null, 2), { name: 'libro.json' });
  for (const fileName of fileNames) {
    zip.file(path.join(config.uploadDir, req.bookId, fileName), { name: `media/${fileName}` });
  }
  await zip.finalize();
});
