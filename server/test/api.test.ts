import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';
import { bookData, entryData, openBook, uniqueCode } from './helpers.js';

const app = createApp();

beforeAll(async () => {
  await migrate();
});
afterAll(async () => {
  await pool.end();
});

describe('accesso con il codice', () => {
  it('crea un libro e lo riapre con il codice, senza badare a maiuscole e spazi', async () => {
    const code = uniqueCode();
    const created = await request(app).post('/api/books').send(bookData(code));
    expect(created.status).toBe(201);
    expect(created.body.book).toMatchObject({ coupleName: 'Anna & Marco', startDate: '2021-06-12' });
    expect(JSON.stringify(created.body)).not.toContain(code);

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ code: `  ${code.toUpperCase()} ` });
    expect(login.status).toBe(200);
    expect((await agent.get('/api/book')).body.book.id).toBe(created.body.book.id);

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/book').expect(401);
  });

  it('rifiuta codici sbagliati, corti o già usati', async () => {
    const code = uniqueCode();
    await request(app).post('/api/books').send(bookData(code)).expect(201);
    await request(app).post('/api/books').send(bookData(code)).expect(409);
    await request(app).post('/api/books').send(bookData('corto')).expect(400);
    await request(app).post('/api/auth/login').send({ code: uniqueCode() }).expect(401);
    await request(app).get('/api/entries').expect(401);
  });

  it('vuole due nomi diversi', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ ...bookData(uniqueCode()), partnerTwo: 'anna' });
    expect(res.status).toBe(400);
  });
});

describe('pagine del libro', () => {
  it('scrive, rilegge, modifica e toglie una pagina', async () => {
    const agent = await openBook(app);
    const created = await agent.post('/api/entries').send(
      entryData({ contentHtml: '<p>Ciao <strong>amore</strong><script>alert(1)</script><a href="x">link</a></p>' }),
    );
    expect(created.status).toBe(201);
    const id = created.body.entry.id;
    expect(created.body.entry.contentHtml).toBe('<p>Ciao <strong>amore</strong>link</p>');

    const updated = await agent.put(`/api/entries/${id}`).send(entryData({ title: 'La nostra sera 🌙', author: 'Marco' }));
    expect(updated.body.entry).toMatchObject({ title: 'La nostra sera 🌙', author: 'Marco', date: '2024-02-14' });

    const fav = await agent.patch(`/api/entries/${id}/favorite`).send({ isFavorite: true });
    expect(fav.body.entry.isFavorite).toBe(true);

    await agent.delete(`/api/entries/${id}`).expect(204);
    await agent.get(`/api/entries/${id}`).expect(404);
  });

  it('valida i campi e la firma', async () => {
    const agent = await openBook(app);
    await agent.post('/api/entries').send(entryData({ title: '  ' })).expect(400);
    await agent.post('/api/entries').send(entryData({ date: '14/02/2024' })).expect(400);
    await agent.post('/api/entries').send(entryData({ tag: 'boh' })).expect(400);
    await agent.post('/api/entries').send(entryData({ author: 'Uno Sconosciuto' })).expect(400);
  });

  it('ordina per data e filtra per testo, etichetta e preferiti', async () => {
    const agent = await openBook(app);
    await agent.post('/api/entries').send(entryData({ date: '2024-03-01', title: 'Litigio e pace', tag: 'difficolta' }));
    await agent.post('/api/entries').send(
      entryData({ date: '2023-08-10', title: 'Mare', contentHtml: '<p>Il tramonto a <em>Polignano</em></p>' }),
    );
    await agent.post('/api/entries').send(entryData({ date: '2024-01-05', title: 'Neve', isFavorite: true }));

    const titles = async (qs: string) =>
      (await agent.get(`/api/entries${qs}`)).body.entries.map((e: { title: string }) => e.title);

    expect(await titles('')).toEqual(['Mare', 'Neve', 'Litigio e pace']);
    expect(await titles('?order=desc')).toEqual(['Litigio e pace', 'Neve', 'Mare']);
    expect(await titles('?q=polignano')).toEqual(['Mare']);
    // % e _ si cercano alla lettera, non come caratteri jolly.
    expect(await titles('?q=100%25')).toEqual([]);
    expect(await titles('?q=_')).toEqual([]);
    expect(await titles('?q=e%25')).toEqual([]);
    expect(await titles('?tag=difficolta')).toEqual(['Litigio e pace']);
    expect(await titles('?favorite=1')).toEqual(['Neve']);
  });

  it('tiene separati i libri di coppie diverse', async () => {
    const ours = await openBook(app);
    const theirs = await openBook(app);
    const { body } = await ours.post('/api/entries').send(entryData());

    await theirs.get(`/api/entries/${body.entry.id}`).expect(404);
    await theirs.put(`/api/entries/${body.entry.id}`).send(entryData()).expect(404);
    await theirs.delete(`/api/entries/${body.entry.id}`).expect(404);
    expect((await theirs.get('/api/entries')).body.entries).toEqual([]);
  });

  it('rinominando un partner aggiorna la firma delle sue pagine', async () => {
    const agent = await openBook(app);
    await agent.post('/api/entries').send(entryData());
    const patched = await agent.patch('/api/book').send({ partnerOne: 'Annina', theme: 'oro' });
    expect(patched.body.book).toMatchObject({ partnerOne: 'Annina', partnerTwo: 'Marco', theme: 'oro' });
    expect((await agent.get('/api/entries')).body.entries[0].author).toBe('Annina');
  });
});
