import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { cleanOrphanMedia } from '../src/routes/media.js';
import { entryData, openBook, TINY_PNG } from './helpers.js';

const app = createApp();

beforeAll(async () => {
  await migrate();
});
afterAll(async () => {
  await pool.end();
});

const at = (id: string, extra: Record<string, unknown>) => ({ id, x: 50, y: 50, w: 40, rot: -3, z: 1, ...extra });
const filesOnDisk = (bookId: string) => {
  const dir = path.join(config.uploadDir, bookId);
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};

describe('copertina', () => {
  it('nasce vuota e conserva post-it, messaggi, sticker e titolo', async () => {
    const agent = await openBook(app);
    expect((await agent.get('/api/book')).body.book.cover).toBeNull();

    const cover = {
      background: 'kraft',
      items: [
        at('a', { type: 'title' }),
        at('b', { type: 'note', text: 'Ti amo, anche il lunedì 💕', color: 'rosa' }),
        at('c', { type: 'text', text: 'Roma, 2021', font: 'stampa', color: 'oro' }),
        at('d', { type: 'sticker', sticker: 'cuore' }),
        at('e', { type: 'sticker', sticker: '🌙' }),
      ],
    };
    const saved = await agent.put('/api/book/cover').send(cover);
    expect(saved.status).toBe(200);
    expect(saved.body.book.cover).toEqual(cover);
    expect((await agent.get('/api/book')).body.book.cover).toEqual(cover);
  });

  it('rifiuta composizioni non valide', async () => {
    const agent = await openBook(app);
    const put = (cover: unknown) => agent.put('/api/book/cover').send(cover as object);
    await put({ background: 'fluo', items: [] }).expect(400);
    await put({ background: 'tema', items: [at('a', { type: 'note', text: 'x'.repeat(241) })] }).expect(400);
    await put({ background: 'tema', items: [at('a', { type: 'ologramma' })] }).expect(400);
    await put({ background: 'tema', items: [at('a', { type: 'sticker', sticker: 'cuore', x: 140 })] }).expect(400);
    const tooMany = Array.from({ length: 41 }, (_, i) => at(`s${i}`, { type: 'sticker', sticker: 'stella' }));
    await put({ background: 'tema', items: tooMany }).expect(400);
  });

  it('custodisce le foto della copertina finché restano in copertina', async () => {
    const agent = await openBook(app);
    const bookId = (await agent.get('/api/book')).body.book.id;
    const photo = (await agent.post('/api/media').attach('file', TINY_PNG, 'noi.png')).body.media;

    const withPhoto = { background: 'tema', items: [at('p', { type: 'photo', mediaId: photo.id, frame: 'polaroid' })] };
    await agent.put('/api/book/cover').send(withPhoto).expect(200);

    // Non è un caricamento orfano: la pulizia periodica non la tocca, nemmeno dopo giorni.
    await pool.query("UPDATE media SET created_at = now() - interval '3 days' WHERE id = $1", [photo.id]);
    await cleanOrphanMedia();
    await agent.get(photo.url).expect(200);

    // Non può finire per sbaglio dentro una pagina, né essere cancellata come bozza.
    const entry = await agent.post('/api/entries').send(entryData({ media: [{ id: photo.id }] }));
    expect(entry.body.entry.media).toEqual([]);
    await agent.delete(`/api/media/${photo.id}`).expect(204);
    await agent.get(photo.url).expect(200);

    // Entra nella copia ZIP.
    const zip = await agent.get('/api/export/zip').buffer(true).parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => done(null, Buffer.concat(chunks)));
    });
    expect((zip.body as Buffer).includes(`media/${filesOnDisk(bookId)[0]}`)).toBe(true);

    // Tolta dalla copertina, sparisce anche il file.
    await agent.put('/api/book/cover').send({ background: 'tema', items: [] }).expect(200);
    await agent.get(photo.url).expect(404);
    expect(filesOnDisk(bookId)).toHaveLength(0);
  });

  it('accetta solo file del proprio libro, liberi e del tipo giusto', async () => {
    const ours = await openBook(app);
    const theirs = await openBook(app);
    const theirPhoto = (await theirs.post('/api/media').attach('file', TINY_PNG, 'a.png')).body.media;
    const ourPhoto = (await ours.post('/api/media').attach('file', TINY_PNG, 'b.png')).body.media;
    const inEntry = (await ours.post('/api/media').attach('file', TINY_PNG, 'c.png')).body.media;
    await ours.post('/api/entries').send(entryData({ media: [{ id: inEntry.id }] }));

    const put = (item: Record<string, unknown>) =>
      ours.put('/api/book/cover').send({ background: 'carta', items: [at('p', item)] });
    await put({ type: 'photo', mediaId: theirPhoto.id }).expect(400);
    await put({ type: 'photo', mediaId: inEntry.id }).expect(400);
    await put({ type: 'video', mediaId: ourPhoto.id }).expect(400);
    await put({ type: 'photo', mediaId: ourPhoto.id }).expect(200);

    await theirs.put('/api/book/cover').send({ background: 'notte', items: [] }).expect(200);
    expect((await ours.get('/api/book')).body.book.cover.background).toBe('carta');
  });
});
