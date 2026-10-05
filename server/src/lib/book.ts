import { z } from 'zod';
import { query } from '../db/pool.js';
import { HttpError } from './errors.js';

export const THEMES = ['rosa', 'bordeaux', 'oro', 'pesca'] as const;

export type BookRow = {
  id: string;
  couple_name: string;
  partner_one: string;
  partner_two: string;
  start_date: string;
  theme: string;
  created_at: Date;
  cover: unknown;
};

export const BOOK_COLUMNS = 'id, couple_name, partner_one, partner_two, start_date, theme, created_at, cover';

export function toBook(row: BookRow) {
  return {
    id: row.id,
    coupleName: row.couple_name,
    partnerOne: row.partner_one,
    partnerTwo: row.partner_two,
    startDate: row.start_date,
    theme: row.theme,
    createdAt: row.created_at,
    // Composizione della copertina; null finché la coppia non la personalizza.
    cover: row.cover ?? null,
  };
}

export async function loadBook(bookId: string): Promise<BookRow> {
  const [row] = await query<BookRow>(`SELECT ${BOOK_COLUMNS} FROM books WHERE id = $1`, [bookId]);
  if (!row) throw new HttpError(401, 'Questo libro non esiste più.');
  return row;
}

const name = (label: string) =>
  z
    .string(`${label}: manca.`)
    .trim()
    .min(1, `${label}: manca.`)
    .max(40, `${label}: al massimo 40 caratteri.`);

export const isoDate = z
  .string('Data non valida.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Data non valida.');

const bookFields = {
  coupleName: z.string('Date un nome al vostro libro.').trim().min(1, 'Date un nome al vostro libro.').max(60),
  partnerOne: name('Il primo nome'),
  partnerTwo: name('Il secondo nome'),
  startDate: isoDate,
  theme: z.enum(THEMES, 'Tema sconosciuto.'),
};

export const createBookSchema = z.object({
  ...bookFields,
  code: z
    .string('Scegliete una chiave.')
    .trim()
    .min(8, 'La chiave deve avere almeno 8 caratteri.')
    .max(80, 'La chiave può avere al massimo 80 caratteri.'),
});

export const updateBookSchema = z.object(bookFields).partial();

export function assertDistinctNames(one: string, two: string): void {
  if (one.toLowerCase() === two.toLowerCase()) {
    throw new HttpError(400, 'I vostri due nomi devono essere diversi, così il libro sa chi scrive.');
  }
}
