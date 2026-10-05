export type Theme = 'rosa' | 'bordeaux' | 'oro' | 'pesca';
export type Tag = 'giornata' | 'pensiero' | 'difficolta' | 'momento-bello' | 'altro';
export type MediaKind = 'image' | 'gif' | 'video' | 'audio' | 'youtube' | 'spotify';

export interface Book {
  id: string;
  coupleName: string;
  partnerOne: string;
  partnerTwo: string;
  /** YYYY-MM-DD */
  startDate: string;
  theme: Theme;
  createdAt: string;
  /** null finché la copertina non viene personalizzata. */
  cover: Cover | null;
}

export interface Media {
  id: string;
  kind: MediaKind;
  /** File caricati: indirizzo protetto dalla sessione. */
  url: string | null;
  /** Contenuti esterni: id YouTube, percorso Spotify o URL di una GIF. */
  externalRef: string | null;
  originalName: string | null;
  mime: string | null;
  caption: string;
}

export interface Entry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  tag: Tag;
  contentHtml: string;
  author: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  media: Media[];
}

export interface EntryInput {
  date: string;
  title: string;
  tag: Tag;
  contentHtml: string;
  author: string;
  isFavorite: boolean;
  media: { id: string; caption: string }[];
}

export interface Person {
  author: string;
  clientId: string;
}

// ---- Copertina ----

export type CoverBackground = 'tema' | 'carta' | 'kraft' | 'notte' | 'cipria';
export type NoteColor = 'giallo' | 'rosa' | 'azzurro' | 'verde';
export type TextColor = 'inchiostro' | 'chiaro' | 'accento' | 'oro';

/** Centro (x, y) e larghezza (w) in percentuale della copertina; rot in gradi; z = ordine di sovrapposizione. */
interface Placed {
  id: string;
  x: number;
  y: number;
  w: number;
  rot: number;
  z: number;
}

export type CoverItem =
  | (Placed & { type: 'title' })
  | (Placed & { type: 'photo'; mediaId: string; frame: 'polaroid' | 'nessuna' })
  | (Placed & { type: 'video'; mediaId: string })
  | (Placed & { type: 'note'; text: string; color: NoteColor })
  | (Placed & { type: 'text'; text: string; font: 'mano' | 'stampa'; color: TextColor })
  | (Placed & { type: 'sticker'; sticker: string });

export interface Cover {
  background: CoverBackground;
  items: CoverItem[];
}
