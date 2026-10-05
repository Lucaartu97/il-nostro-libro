import type { Cover, CoverBackground, CoverItem, NoteColor, TextColor } from './types';

export const MAX_COVER_ITEMS = 40;

export const BACKGROUNDS: { id: CoverBackground; label: string; dark: boolean }[] = [
  { id: 'tema', label: 'Colore del libro', dark: true },
  { id: 'carta', label: 'Carta crema', dark: false },
  { id: 'kraft', label: 'Carta da pacchi', dark: false },
  { id: 'cipria', label: 'Cipria', dark: false },
  { id: 'notte', label: 'Notte stellata', dark: true },
];

export const NOTE_COLORS: { id: NoteColor; label: string }[] = [
  { id: 'giallo', label: 'Giallo' },
  { id: 'rosa', label: 'Rosa' },
  { id: 'azzurro', label: 'Azzurro' },
  { id: 'verde', label: 'Verde' },
];

export const TEXT_COLORS: { id: TextColor; label: string }[] = [
  { id: 'inchiostro', label: 'Inchiostro' },
  { id: 'chiaro', label: 'Chiaro' },
  { id: 'accento', label: 'Colore del libro' },
  { id: 'oro', label: 'Oro' },
];

/** Sticker disegnati a mano (vedi Decor.tsx) ed emoji. */
export const DOODLE_STICKERS = ['cuore', 'stella', 'fiore', 'rametto'] as const;
export const EMOJI_STICKERS = [
  '❤️', '💕', '💋', '💌', '💍', '🌹', '🌻', '🌿', '✨', '🌙', '☀️', '🌈',
  '🎶', '🥂', '☕', '🍝', '🎂', '🌊', '⛰️', '✈️', '🏡', '📍', '📷', '🐾',
];

export const mediaUrl = (mediaId: string) => `/api/media/${mediaId}/file`;

const DEFAULT_WIDTH: Record<CoverItem['type'], number> = {
  title: 78,
  photo: 46,
  video: 58,
  note: 34,
  text: 62,
  sticker: 16,
};

const between = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const newId = () => crypto.randomUUID().slice(0, 8);
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const topZ = (items: CoverItem[]) => items.reduce((max, item) => Math.max(max, item.z), 0) + 1;

/** La copertina di un libro appena nato: titolo, un cuore, un rametto. */
export function defaultCover(): Cover {
  return {
    background: 'tema',
    items: [
      { id: 'cuore', type: 'sticker', sticker: 'cuore', x: 50, y: 22, w: 17, rot: -4, z: 1 },
      { id: 'titolo', type: 'title', x: 50, y: 48, w: 78, rot: 0, z: 2 },
      { id: 'rametto', type: 'sticker', sticker: 'rametto', x: 50, y: 80, w: 11, rot: 10, z: 3 },
    ],
  };
}

type Draft =
  | { type: 'title' }
  | { type: 'photo'; mediaId: string }
  | { type: 'video'; mediaId: string }
  | { type: 'note' }
  | { type: 'text' }
  | { type: 'sticker'; sticker: string };

/**
 * Crea un elemento nuovo, appoggiato verso il centro e un po' storto come se fosse stato incollato a mano.
 * "slot" serve ai collage: più foto aggiunte insieme si dispongono a griglia invece di ammucchiarsi.
 */
export function createItem(cover: Cover, draft: Draft, slot?: { index: number; total: number }): CoverItem {
  const dark = BACKGROUNDS.find((b) => b.id === cover.background)?.dark ?? false;
  let x = between(38, 62);
  let y = between(36, 64);
  let w = DEFAULT_WIDTH[draft.type];
  if (slot && slot.total > 1) {
    const cols = slot.total <= 4 ? 2 : 3;
    const rows = Math.ceil(slot.total / cols);
    x = ((slot.index % cols) + 0.5) * (100 / cols) + between(-3, 3);
    y = 14 + (Math.floor(slot.index / cols) + 0.5) * (72 / rows) + between(-3, 3);
    w = Math.round(92 / cols);
  }
  const placed = { id: newId(), x, y, w, rot: between(-7, 7), z: topZ(cover.items) + (slot?.index ?? 0) };
  switch (draft.type) {
    case 'title':
      return { ...placed, rot: 0, type: 'title' };
    case 'photo':
      return { ...placed, type: 'photo', mediaId: draft.mediaId, frame: 'polaroid' };
    case 'video':
      return { ...placed, type: 'video', mediaId: draft.mediaId };
    case 'note':
      return { ...placed, type: 'note', text: 'Scrivi qui…', color: 'giallo' };
    case 'text':
      return { ...placed, type: 'text', text: 'Il nostro messaggio', font: 'mano', color: dark ? 'chiaro' : 'inchiostro' };
    case 'sticker':
      return { ...placed, type: 'sticker', sticker: draft.sticker };
  }
}
