import type { Entry } from '../../lib/types';

export interface IndexItem {
  entry: Entry;
  /** Indice della pagina nel libro (0 = copertina, 1 = frontespizio): è anche il numero stampato in fondo. */
  page: number;
}

export type PageSpec =
  | { kind: 'cover' }
  | { kind: 'title' }
  | { kind: 'index'; items: IndexItem[]; first: boolean }
  | { kind: 'entry'; entry: Entry }
  | { kind: 'next' }
  | { kind: 'blank' };

const INDEX_ROWS = 9;

/**
 * Impagina il libro: copertina, frontespizio, indice, una pagina per ricordo,
 * e in fondo la pagina bianca che aspetta il prossimo.
 */
export function buildPages(entries: Entry[]): PageSpec[] {
  const indexPages = Math.max(1, Math.ceil(entries.length / INDEX_ROWS));
  const firstEntryPage = 2 + indexPages;
  const items: IndexItem[] = entries.map((entry, i) => ({ entry, page: firstEntryPage + i }));

  const pages: PageSpec[] = [{ kind: 'cover' }, { kind: 'title' }];
  for (let i = 0; i < indexPages; i++) {
    pages.push({ kind: 'index', items: items.slice(i * INDEX_ROWS, (i + 1) * INDEX_ROWS), first: i === 0 });
  }
  for (const entry of entries) pages.push({ kind: 'entry', entry });
  pages.push({ kind: 'next' });
  // La copertina sta da sola; dopo di lei le pagine vanno a coppie, così nessuna facciata resta a metà.
  if (pages.length % 2 === 0) pages.push({ kind: 'blank' });
  return pages;
}

export function pageOfEntry(pages: PageSpec[], entryId: string): number {
  return pages.findIndex((p) => p.kind === 'entry' && p.entry.id === entryId);
}
