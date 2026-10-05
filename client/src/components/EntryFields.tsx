import { Star } from 'lucide-react';
import { TAGS } from '../lib/tags';
import type { Book, Tag } from '../lib/types';

export interface Fields {
  date: string;
  title: string;
  tag: Tag;
  author: string;
  isFavorite: boolean;
}

interface EntryFieldsProps {
  book: Book;
  value: Fields;
  onChange: (change: Partial<Fields>) => void;
}

/** Data, firma, etichetta e titolo della pagina. */
export function EntryFields({ book, value, onChange }: EntryFieldsProps) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="label">Quando</span>
          <input
            type="date"
            className="field mt-1"
            value={value.date}
            onChange={(e) => onChange({ date: e.target.value })}
            required
          />
        </label>
        <div role="radiogroup" aria-labelledby="chi-scrive">
          <span className="label" id="chi-scrive">
            Chi scrive
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[book.partnerOne, book.partnerTwo].map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={value.author === name}
                className="chip font-hand text-xl"
                onClick={() => onChange({ author: name })}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="radiogroup" aria-labelledby="che-pagina">
        <span className="label" id="che-pagina">
          Che pagina è
        </span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {TAGS.map(({ id, label, icon: Icon, hint }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={value.tag === id}
              className="chip"
              title={hint}
              onClick={() => onChange({ tag: id })}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="label">Titolo</span>
          <input
            className="field mt-1 text-2xl font-semibold"
            value={value.title}
            maxLength={120}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Dai un titolo a questo ricordo"
          />
        </label>
        <button
          type="button"
          className="chip flex-none"
          aria-pressed={value.isFavorite}
          onClick={() => onChange({ isFavorite: !value.isFavorite })}
          title="I momenti speciali si ritrovano subito tra i preferiti"
        >
          <Star
            key={String(value.isFavorite)}
            size={17}
            className={value.isFavorite ? 'animate-heartbeat fill-gold text-gold' : ''}
            aria-hidden
          />
          <span className="hidden sm:inline">Momento speciale</span>
          <span className="sr-only sm:hidden">Momento speciale</span>
        </button>
      </div>
    </>
  );
}
