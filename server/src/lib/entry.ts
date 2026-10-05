import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { isoDate } from './book.js';
import { HttpError } from './errors.js';

export const TAGS = ['giornata', 'pensiero', 'difficolta', 'momento-bello', 'altro'] as const;

export type MediaRow = {
  id: string;
  kind: string;
  file_name: string | null;
  original_name: string | null;
  mime: string | null;
  external_ref: string | null;
  caption: string;
};

export type EntryRow = {
  id: string;
  entry_date: string;
  title: string;
  tag: string;
  content_html: string;
  author: string;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
  media: MediaRow[];
};

export function toMedia(row: MediaRow) {
  return {
    id: row.id,
    kind: row.kind,
    // I file caricati si leggono solo con la sessione del libro.
    url: row.file_name ? `/api/media/${row.id}/file` : null,
    externalRef: row.external_ref,
    originalName: row.original_name,
    mime: row.mime,
    caption: row.caption,
  };
}

export function toEntry(row: EntryRow) {
  return {
    id: row.id,
    date: row.entry_date,
    title: row.title,
    tag: row.tag,
    contentHtml: row.content_html,
    author: row.author,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media: row.media.map(toMedia),
  };
}

export const ENTRY_SELECT = `
  SELECT e.id, e.entry_date, e.title, e.tag, e.content_html, e.author, e.is_favorite,
         e.created_at, e.updated_at, COALESCE(m.items, '[]'::json) AS media
    FROM entries e
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object(
                 'id', id, 'kind', kind, 'file_name', file_name, 'original_name', original_name,
                 'mime', mime, 'external_ref', external_ref, 'caption', caption
               ) ORDER BY position, created_at
             ) AS items
        FROM media
       WHERE entry_id = e.id
    ) m ON true`;

export async function loadEntry(bookId: string, entryId: string): Promise<EntryRow> {
  const [row] = await query<EntryRow>(`${ENTRY_SELECT} WHERE e.book_id = $1 AND e.id = $2`, [bookId, entryId]);
  if (!row) throw new HttpError(404, 'Questa pagina non è più nel libro.');
  return row;
}

export const entrySchema = z.object({
  date: isoDate,
  title: z
    .string('Dai un titolo a questa pagina.')
    .trim()
    .min(1, 'Dai un titolo a questa pagina.')
    .max(120, 'Il titolo può avere al massimo 120 caratteri.'),
  tag: z.enum(TAGS, 'Etichetta sconosciuta.'),
  contentHtml: z.string().max(100_000, 'Questa pagina è troppo lunga: dividila in due.').default(''),
  author: z.string('Manca la firma di chi scrive.').trim().min(1, 'Manca la firma di chi scrive.'),
  isFavorite: z.boolean().default(false),
  media: z
    .array(z.object({ id: z.uuid(), caption: z.string().trim().max(200).default('') }))
    .max(24, 'Una pagina può custodire al massimo 24 ricordi multimediali.')
    .default([]),
});

export const idParam = z.object({ id: z.uuid('Pagina non trovata.') });

export const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.enum(TAGS).optional(),
  favorite: z.enum(['1', 'true']).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export async function removeFiles(bookId: string, fileNames: (string | null)[]): Promise<void> {
  await Promise.all(
    fileNames
      .filter((f): f is string => Boolean(f))
      .map((f) => fs.rm(path.join(config.uploadDir, bookId, f), { force: true })),
  );
}
