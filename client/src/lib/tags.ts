import { Bookmark, CloudRain, Feather, type LucideIcon, Sparkles, Sun } from 'lucide-react';
import type { Tag, Theme } from './types';

export const TAGS: { id: Tag; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'giornata', label: 'Giornata', icon: Sun, hint: 'Com’è andata oggi' },
  { id: 'pensiero', label: 'Pensiero', icon: Feather, hint: 'Qualcosa che ti gira in testa' },
  { id: 'difficolta', label: 'Difficoltà', icon: CloudRain, hint: 'Un momento da attraversare insieme' },
  { id: 'momento-bello', label: 'Momento bello', icon: Sparkles, hint: 'Da non dimenticare' },
  { id: 'altro', label: 'Altro', icon: Bookmark, hint: 'Tutto il resto' },
];

export const tagInfo = (id: Tag) => TAGS.find((t) => t.id === id) ?? TAGS[TAGS.length - 1];

export const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: 'rosa', label: 'Rosa antico', swatch: '#c4728a' },
  { id: 'bordeaux', label: 'Bordeaux', swatch: '#8e3b4d' },
  { id: 'oro', label: 'Oro', swatch: '#b5873a' },
  { id: 'pesca', label: 'Pesca', swatch: '#d68463' },
];
