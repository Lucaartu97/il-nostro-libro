import { z } from 'zod';

export const COVER_BACKGROUNDS = ['tema', 'carta', 'kraft', 'notte', 'cipria'] as const;
export const NOTE_COLORS = ['giallo', 'rosa', 'azzurro', 'verde'] as const;
export const TEXT_COLORS = ['inchiostro', 'chiaro', 'accento', 'oro'] as const;
export const MAX_COVER_ITEMS = 40;

// Posizione del centro (x, y) e larghezza (w) in percentuale della copertina; rot in gradi.
const placed = {
  id: z.string().min(1).max(40),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(4).max(100),
  rot: z.number().min(-180).max(180),
  z: z.number().int().min(0).max(1000),
};

const coverItem = z.discriminatedUnion('type', [
  z.object({ ...placed, type: z.literal('title') }),
  z.object({
    ...placed,
    type: z.literal('photo'),
    mediaId: z.uuid(),
    frame: z.enum(['polaroid', 'nessuna']).default('polaroid'),
  }),
  z.object({ ...placed, type: z.literal('video'), mediaId: z.uuid() }),
  z.object({
    ...placed,
    type: z.literal('note'),
    text: z.string().max(240, 'Un post-it tiene al massimo 240 caratteri.'),
    color: z.enum(NOTE_COLORS).default('giallo'),
  }),
  z.object({
    ...placed,
    type: z.literal('text'),
    text: z.string().max(240, 'Un messaggio in copertina tiene al massimo 240 caratteri.'),
    font: z.enum(['mano', 'stampa']).default('mano'),
    color: z.enum(TEXT_COLORS).default('inchiostro'),
  }),
  z.object({ ...placed, type: z.literal('sticker'), sticker: z.string().min(1).max(16) }),
]);

export const coverSchema = z.object({
  background: z.enum(COVER_BACKGROUNDS, 'Sfondo sconosciuto.'),
  items: z
    .array(coverItem, 'Copertina non valida.')
    .max(MAX_COVER_ITEMS, `La copertina tiene al massimo ${MAX_COVER_ITEMS} elementi.`),
});

export type Cover = z.infer<typeof coverSchema>;
export type CoverItem = Cover['items'][number];

/** I file (foto e video) a cui la copertina fa riferimento. */
export function coverMedia(cover: Cover): { id: string; kind: 'photo' | 'video' }[] {
  return cover.items.flatMap((item) =>
    item.type === 'photo' || item.type === 'video' ? [{ id: item.mediaId, kind: item.type }] : [],
  );
}
