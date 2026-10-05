import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { requireBook } from '../lib/auth.js';
import { loadBook } from '../lib/book.js';
import {
  ENTRY_SELECT,
  type EntryRow,
  entrySchema,
  idParam,
  listQuery,
  loadEntry,
  removeFiles,
  toEntry,
} from '../lib/entry.js';
import { HttpError } from '../lib/errors.js';
import { cleanHtml, htmlToText } from '../lib/sanitize.js';
import { activeLock, broadcast } from '../realtime/hub.js';

const GONE = 'Questa pagina non è più nel libro.';

async function assertAuthor(bookId: string, author: string): Promise<void> {
  const book = await loadBook(bookId);
  if (author !== book.partner_one && author !== book.partner_two) {
    throw new HttpError(400, 'Questa firma non appartiene al vostro libro.');
  }
}

function assertNotLocked(bookId: string, entryId: string, clientId: string | null): void {
  const lock = activeLock(bookId, entryId);
  if (lock && lock.clientId !== clientId) {
    throw new HttpError(423, `${lock.author} sta scrivendo questa pagina proprio adesso.`, {
      lockedBy: lock.author,
    });
  }
}

export const entriesRouter = Router();
entriesRouter.use(requireBook);

entriesRouter.get('/entries', async (req, res) => {
  const { q, tag, favorite, order } = listQuery.parse(req.query);
  const where = ['e.book_id = $1'];
  const params: unknown[] = [req.bookId];

  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    where.push(`(e.title ILIKE $${params.length} OR e.content_text ILIKE $${params.length})`);
  }
  if (tag) {
    params.push(tag);
    where.push(`e.tag = $${params.length}`);
  }
  if (favorite) where.push('e.is_favorite');

  const dir = order === 'desc' ? 'DESC' : 'ASC';
  const rows = await query<EntryRow>(
    `${ENTRY_SELECT} WHERE ${where.join(' AND ')} ORDER BY e.entry_date ${dir}, e.created_at ${dir}`,
    params,
  );
  res.json({ entries: rows.map(toEntry) });
});

entriesRouter.get('/entries/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ entry: toEntry(await loadEntry(req.bookId, id)) });
});

entriesRouter.post('/entries', async (req, res) => {
  const data = entrySchema.parse(req.body);
  await assertAuthor(req.bookId, data.author);
  const html = cleanHtml(data.contentHtml);

  const entryId = await withTransaction(async (client) => {
    const created = await client.query<{ id: string }>(
      `INSERT INTO entries (book_id, entry_date, title, tag, content_html, content_text, author, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [req.bookId, data.date, data.title, data.tag, html, htmlToText(html), data.author, data.isFavorite],
    );
    const id = created.rows[0]?.id as string;
    for (const [position, item] of data.media.entries()) {
      await client.query(
        `UPDATE media SET entry_id = $1, position = $2, caption = $3
          WHERE id = $4 AND book_id = $5 AND entry_id IS NULL AND NOT on_cover`,
        [id, position, item.caption, item.id, req.bookId],
      );
    }
    return id;
  });

  const entry = toEntry(await loadEntry(req.bookId, entryId));
  broadcast(req.bookId, 'entry:created', { entry, byClientId: req.clientId });
  res.status(201).json({ entry });
});

entriesRouter.put('/entries/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = entrySchema.parse(req.body);
  await assertAuthor(req.bookId, data.author);
  assertNotLocked(req.bookId, id, req.clientId);
  const html = cleanHtml(data.contentHtml);
  const keepIds = data.media.map((m) => m.id);

  const removed = await withTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE entries
          SET entry_date = $3, title = $4, tag = $5, content_html = $6, content_text = $7,
              author = $8, is_favorite = $9, updated_at = now()
        WHERE book_id = $1 AND id = $2`,
      [req.bookId, id, data.date, data.title, data.tag, html, htmlToText(html), data.author, data.isFavorite],
    );
    if (!updated.rowCount) throw new HttpError(404, GONE);

    const gone = await client.query<{ file_name: string | null }>(
      'DELETE FROM media WHERE entry_id = $1 AND NOT (id = ANY($2::uuid[])) RETURNING file_name',
      [id, keepIds],
    );
    for (const [position, item] of data.media.entries()) {
      await client.query(
        `UPDATE media SET entry_id = $1, position = $2, caption = $3
          WHERE id = $4 AND book_id = $5 AND NOT on_cover AND (entry_id IS NULL OR entry_id = $1)`,
        [id, position, item.caption, item.id, req.bookId],
      );
    }
    return gone.rows.map((r) => r.file_name);
  });
  await removeFiles(req.bookId, removed);

  const entry = toEntry(await loadEntry(req.bookId, id));
  broadcast(req.bookId, 'entry:updated', { entry, byClientId: req.clientId });
  res.json({ entry });
});

entriesRouter.patch('/entries/:id/favorite', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { isFavorite } = z.object({ isFavorite: z.boolean() }).parse(req.body);
  const rows = await query('UPDATE entries SET is_favorite = $3 WHERE book_id = $1 AND id = $2 RETURNING id', [
    req.bookId,
    id,
    isFavorite,
  ]);
  if (!rows.length) throw new HttpError(404, GONE);

  const entry = toEntry(await loadEntry(req.bookId, id));
  broadcast(req.bookId, 'entry:updated', { entry, byClientId: req.clientId, quiet: true });
  res.json({ entry });
});

entriesRouter.delete('/entries/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  assertNotLocked(req.bookId, id, req.clientId);

  const files = await withTransaction(async (client) => {
    const media = await client.query<{ file_name: string | null }>(
      'SELECT file_name FROM media WHERE entry_id = $1 AND book_id = $2',
      [id, req.bookId],
    );
    const deleted = await client.query('DELETE FROM entries WHERE book_id = $1 AND id = $2', [req.bookId, id]);
    if (!deleted.rowCount) throw new HttpError(404, GONE);
    return media.rows.map((r) => r.file_name);
  });
  await removeFiles(req.bookId, files);

  broadcast(req.bookId, 'entry:deleted', { entryId: id, byClientId: req.clientId });
  res.status(204).end();
});
