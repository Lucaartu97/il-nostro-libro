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
