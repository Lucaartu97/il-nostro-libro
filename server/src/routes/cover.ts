import { Router } from 'express';
import { withTransaction } from '../db/pool.js';
import { requireBook } from '../lib/auth.js';
import { BOOK_COLUMNS, type BookRow, toBook } from '../lib/book.js';
import { coverMedia, coverSchema } from '../lib/cover.js';
import { removeFiles } from '../lib/entry.js';
import { HttpError } from '../lib/errors.js';
import { broadcast } from '../realtime/hub.js';

const KINDS_FOR = { photo: ['image', 'gif'], video: ['video'] };

export const coverRouter = Router();

/** Salva la copertina: la composizione, e quali file caricati ne fanno parte. */
coverRouter.put('/book/cover', requireBook, async (req, res) => {
  const cover = coverSchema.parse(req.body);
  const wanted = coverMedia(cover);
  const ids = [...new Set(wanted.map((m) => m.id))];

  const { row, removed } = await withTransaction(async (client) => {
    // Solo file di questo libro, non già legati a una pagina, e del tipo giusto.
    const found = await client.query<{ id: string; kind: string }>(
      'SELECT id, kind FROM media WHERE book_id = $1 AND entry_id IS NULL AND id = ANY($2::uuid[])',
      [req.bookId, ids],
    );
    const kindOf = new Map(found.rows.map((m) => [m.id, m.kind]));
    for (const { id, kind } of wanted) {
      if (!KINDS_FOR[kind].includes(kindOf.get(id) ?? '')) {
        throw new HttpError(400, 'Una foto o un video della copertina non è più disponibile: caricalo di nuovo.');
      }
    }

    const updated = await client.query<BookRow>(
      `UPDATE books SET cover = $2 WHERE id = $1 RETURNING ${BOOK_COLUMNS}`,
      [req.bookId, JSON.stringify(cover)],
    );
    await client.query('UPDATE media SET on_cover = true WHERE book_id = $1 AND id = ANY($2::uuid[])', [
      req.bookId,
      ids,
    ]);
    const gone = await client.query<{ file_name: string | null }>(
      'DELETE FROM media WHERE book_id = $1 AND on_cover AND NOT (id = ANY($2::uuid[])) RETURNING file_name',
      [req.bookId, ids],
    );
    return { row: updated.rows[0], removed: gone.rows.map((r) => r.file_name) };
  });
  if (!row) throw new HttpError(401, 'Questo libro non esiste più.');
  await removeFiles(req.bookId, removed);

  const book = toBook(row);
  broadcast(req.bookId, 'book:updated', { book, byClientId: req.clientId });
  res.json({ book });
});
