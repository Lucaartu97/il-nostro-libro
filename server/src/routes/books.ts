import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { clearSessionCookie, codeLookup, normalizeCode, requireBook, setSessionCookie } from '../lib/auth.js';
import {
  assertDistinctNames,
  BOOK_COLUMNS,
  type BookRow,
  createBookSchema,
  loadBook,
  toBook,
  updateBookSchema,
} from '../lib/book.js';
import { HttpError } from '../lib/errors.js';
import { broadcast } from '../realtime/hub.js';

const skipInTests = () => process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTests,
  message: { error: 'Troppi tentativi. Fate un respiro e riprovate tra qualche minuto.' },
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: 'Avete creato molti libri in poco tempo. Riprovate più tardi.' },
});

export const booksRouter = Router();

booksRouter.post('/books', createLimiter, async (req, res) => {
  const data = createBookSchema.parse(req.body);
  assertDistinctNames(data.partnerOne, data.partnerTwo);
  const lookup = await codeLookup(data.code);

  const [row] = await query<BookRow>(
    `INSERT INTO books (couple_name, partner_one, partner_two, start_date, theme, code_lookup)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (code_lookup) DO NOTHING
     RETURNING ${BOOK_COLUMNS}`,
    [data.coupleName, data.partnerOne, data.partnerTwo, data.startDate, data.theme, lookup],
  );
  if (!row) {
    throw new HttpError(409, 'Questo codice custodisce già un altro libro. Sceglietene uno soltanto vostro.');
  }
  setSessionCookie(res, row.id);
  res.status(201).json({ book: toBook(row) });
});

booksRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { code } = z.object({ code: z.string('Scrivete il vostro codice.').max(80) }).parse(req.body);
  if (!normalizeCode(code)) throw new HttpError(400, 'Scrivete il vostro codice.');

  const [row] = await query<BookRow>(`SELECT ${BOOK_COLUMNS} FROM books WHERE code_lookup = $1`, [
    await codeLookup(code),
  ]);
  if (!row) {
    throw new HttpError(401, 'Nessun libro si apre con questo codice. Controllate di averlo scritto bene.');
  }
  setSessionCookie(res, row.id);
  res.json({ book: toBook(row) });
});

booksRouter.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

booksRouter.get('/book', requireBook, async (req, res) => {
  res.json({ book: toBook(await loadBook(req.bookId)) });
});

booksRouter.patch('/book', requireBook, async (req, res) => {
  const data = updateBookSchema.parse(req.body);
  const current = await loadBook(req.bookId);
  const partnerOne = data.partnerOne ?? current.partner_one;
  const partnerTwo = data.partnerTwo ?? current.partner_two;
  assertDistinctNames(partnerOne, partnerTwo);

  const updated = await withTransaction(async (client) => {
    const result = await client.query<BookRow>(
      `UPDATE books
          SET couple_name = $2, partner_one = $3, partner_two = $4, start_date = $5, theme = $6
        WHERE id = $1
        RETURNING ${BOOK_COLUMNS}`,
      [
        req.bookId,
        data.coupleName ?? current.couple_name,
        partnerOne,
        partnerTwo,
        data.startDate ?? current.start_date,
        data.theme ?? current.theme,
      ],
    );
    // Le pagine già scritte seguono il nuovo nome di chi le ha firmate.
    await client.query(
      `UPDATE entries
          SET author = CASE WHEN author = $2 THEN $3 WHEN author = $4 THEN $5 ELSE author END
        WHERE book_id = $1`,
      [req.bookId, current.partner_one, partnerOne, current.partner_two, partnerTwo],
    );
    return result.rows[0];
  });
  if (!updated) throw new HttpError(401, 'Questo libro non esiste più.');

  const book = toBook(updated);
  broadcast(req.bookId, 'book:updated', { book, byClientId: req.clientId });
  res.json({ book });
});
