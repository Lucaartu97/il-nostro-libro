import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { entryData, openBook, TINY_PNG } from './helpers.js';

const app = createApp();

beforeAll(async () => {
  await migrate();
});
afterAll(async () => {
  await pool.end();
});

const filesOnDisk = (bookId: string) => {
  const dir = path.join(config.uploadDir, bookId);
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};

describe('multimedia', () => {
  it('carica una foto, la lega a una pagina e la serve solo a chi ha il codice', async () => {
    const agent = await openBook(app);
    const bookId = (await agent.get('/api/book')).body.book.id;

    const up = await agent.post('/api/media').attach('file', TINY_PNG, 'noi due.png');
    expect(up.status).toBe(201);
    expect(up.body.media).toMatchObject({ kind: 'image', mime: 'image/png', originalName: 'noi due.png' });

    const created = await agent
      .post('/api/entries')
      .send(entryData({ media: [{ id: up.body.media.id, caption: 'Noi due' }] }));
    expect(created.body.entry.media).toHaveLength(1);
    expect(created.body.entry.media[0].caption).toBe('Noi due');

    const file = await agent.get(up.body.media.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(file.body, TINY_PNG)).toBe(0);

    await request(app).get(up.body.media.url).expect(401);
    const stranger = await openBook(app);
    await stranger.get(up.body.media.url).expect(404);

    // Togliendo la foto dalla pagina sparisce anche il file.
    expect(filesOnDisk(bookId)).toHaveLength(1);
    const updated = await agent.put(`/api/entries/${created.body.entry.id}`).send(entryData({ media: [] }));
    expect(updated.body.entry.media).toEqual([]);
    expect(filesOnDisk(bookId)).toHaveLength(0);
  });

  it('riconosce il tipo dal contenuto e rifiuta ciò che non conosce', async () => {
    const agent = await openBook(app);
    const fake = await agent.post('/api/media').attach('file', Buffer.from('<script>alert(1)</script>'), 'foto.png');
    expect(fake.status).toBe(415);

    const gif = await agent.post('/api/media').attach('file', Buffer.from('GIF89a' + '\0'.repeat(32)), 'x.png');
    expect(gif.body.media).toMatchObject({ kind: 'gif', mime: 'image/gif' });
  });

  it('rifiuta i file oltre il limite', async () => {
    const agent = await openBook(app);
    const big = Buffer.concat([TINY_PNG, Buffer.alloc(config.maxUploadBytes)]);
    const res = await agent.post('/api/media').attach('file', big, 'enorme.png');
    expect(res.status).toBe(413);
  });

  it('incornicia canzoni e video da un link', async () => {
    const agent = await openBook(app);
    const song = await agent.post('/api/media/embed').send({ url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT' });
    expect(song.body.media).toMatchObject({ kind: 'spotify', externalRef: 'track/4cOdK2wGLETKBW3PvgPWqT', url: null });
    await agent.post('/api/media/embed').send({ url: 'https://example.com/canzone' }).expect(400);
  });

  it('cancellando una pagina cancella anche i suoi file', async () => {
    const agent = await openBook(app);
    const bookId = (await agent.get('/api/book')).body.book.id;
    const up = await agent.post('/api/media').attach('file', TINY_PNG, 'a.png');
    const created = await agent.post('/api/entries').send(entryData({ media: [{ id: up.body.media.id }] }));
    expect(filesOnDisk(bookId)).toHaveLength(1);
    await agent.delete(`/api/entries/${created.body.entry.id}`).expect(204);
    expect(filesOnDisk(bookId)).toHaveLength(0);
  });
});

describe('esportazione', () => {
  it('esporta il libro in JSON e in ZIP', async () => {
    const agent = await openBook(app);
    const up = await agent.post('/api/media').attach('file', TINY_PNG, 'a.png');
    await agent.post('/api/entries').send(entryData({ media: [{ id: up.body.media.id }] }));

    const json = await agent.get('/api/export/json');
    expect(json.headers['content-disposition']).toMatch(/attachment; filename="il-nostro-libro-.*\.json"/);
    expect(json.body.entries).toHaveLength(1);
    expect(json.body.book.coupleName).toBe('Anna & Marco');

    const zip = await agent
      .get('/api/export/zip')
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(zip.status).toBe(200);
    expect((zip.body as Buffer).subarray(0, 2).toString()).toBe('PK');
    expect((zip.body as Buffer).includes('libro.json')).toBe(true);
    expect((zip.body as Buffer).includes('media/')).toBe(true);
  });
});
