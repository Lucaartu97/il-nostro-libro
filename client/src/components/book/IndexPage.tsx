import { Star } from 'lucide-react';
import { formatShortDate } from '../../lib/format';
import { Divider } from '../Decor';
import type { IndexItem } from './model';
import { PageShell } from './pages';

interface IndexPageProps {
  items: IndexItem[];
  first: boolean;
  number: number;
  onJump: (page: number) => void;
}

export function IndexPage({ items, first, number, onJump }: IndexPageProps) {
  return (
    <PageShell number={number}>
      <h2 className="text-center text-3xl font-semibold italic text-accent-deep">{first ? 'Indice' : 'Indice, ancora'}</h2>
      <Divider className="mb-5 mt-2" />
      {items.length === 0 ? (
        <p className="mt-10 text-center font-hand text-2xl text-ink-soft">
          Il libro è ancora tutto da scrivere.
          <br />
          La prima pagina vi aspetta.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map(({ entry, page }) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onJump(page)}
                className="group flex w-full items-baseline gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-accent-soft/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1.12rem] font-semibold leading-snug group-hover:text-accent-deep">
                    {entry.isFavorite && (
                      <Star size={13} className="mr-1 inline -translate-y-px fill-gold text-gold" aria-label="Momento speciale" />
                    )}
                    {entry.title}
                  </span>
                  <span className="block text-[0.85rem] italic text-ink-soft">
                    {formatShortDate(entry.date)} · {entry.author}
                  </span>
                </span>
                <span className="mb-1 flex-none self-end border-b border-dotted border-ink-soft/50 px-3" aria-hidden />
                <span className="flex-none tabular-nums text-ink-soft">{page + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </PageShell>
  );
}
