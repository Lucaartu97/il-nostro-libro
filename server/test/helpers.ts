import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';

export const uniqueCode = () => `IlNostroAmore-${randomUUID()}`;

export const bookData = (code: string) => ({
  coupleName: 'Anna & Marco',
  partnerOne: 'Anna',
  partnerTwo: 'Marco',
  startDate: '2021-06-12',
  theme: 'rosa',
  code,
});

export const entryData = (overrides: Record<string, unknown> = {}) => ({
  date: '2024-02-14',
  title: 'San Valentino',
  tag: 'momento-bello',
  contentHtml: '<p>Cena a lume di candela</p>',
  author: 'Anna',
  media: [],
  ...overrides,
});

/** Crea un libro nuovo e restituisce un agente che ne conserva la sessione. */
export async function openBook(app: Express, code = uniqueCode()) {
  const agent = request.agent(app);
  const res = await agent.post('/api/books').send(bookData(code));
  if (res.status !== 201) throw new Error(`Creazione libro fallita: ${res.status} ${res.text}`);
  return agent;
}

// PNG 1×1 valido.
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
