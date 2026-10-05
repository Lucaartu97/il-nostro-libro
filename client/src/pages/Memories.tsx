import { ArrowDownUp, Search, Star } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { MemoryCard } from '../components/MemoryCard';
import { TopBar } from '../components/TopBar';
import { useLive } from '../context/Live';
import { api, errorMessage } from '../lib/api';
import { formatMonth } from '../lib/format';
import { TAGS } from '../lib/tags';
import type { Entry, Tag } from '../lib/types';
import { Loading } from './BookView';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Vista cronologica con ricerca, filtro per etichetta e momenti preferiti. */
export function Memories() {
  const { entries } = useLive();
  const [text, setText] = useState('');
  const [tag, setTag] = useState<Tag | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [results, setResults] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const q = useDebounced(text.trim(), 300);

  // "entries" tra le dipendenze: se il partner scrive mentre cerchi, i risultati si aggiornano.
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ order });
    if (q) params.set('q', q);
    if (tag) params.set('tag', tag);
    if (favorite) params.set('favorite', '1');
    api<{ entries: Entry[] }>(`/entries?${params}`).then(
      (data) => alive && (setResults(data.entries), setError(null)),
      (err) => alive && setError(errorMessage(err)),
    );
    return () => {
      alive = false;
    };
  }, [q, tag, favorite, order, entries]);

  const filtering = Boolean(q || tag || favorite);
  return (
    <div className="min-h-dvh pb-16">
      <TopBar />
      <main className="mx-auto w-[min(46rem,calc(100%-1.5rem))]">
        <h1 className="mt-3 text-center text-4xl font-semibold italic text-accent-deep">I vostri ricordi</h1>
        <p className="mb-5 text-center italic text-ink-soft">
          Il tempo trasforma i momenti in ricordi. Questo libro li custodisce per voi.
        </p>

        <label className="card flex items-center gap-3 rounded-full px-5 py-1 shadow-none focus-within:border-accent">
          <Search size={20} className="flex-none text-ink-soft" aria-hidden />
          <input
            type="search"
            className="field border-0"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cerca una parola, un luogo, un giorno…"
            aria-label="Cerca tra i ricordi"
          />
        </label>

        <div className="thin-scroll -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-2" role="group" aria-label="Filtri">
          <button type="button" className="chip" aria-pressed={favorite} onClick={() => setFavorite((f) => !f)}>
            <Star size={16} className={favorite ? 'fill-gold text-gold' : ''} aria-hidden />
            Preferiti
          </button>
          {TAGS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="chip" aria-pressed={tag === id} onClick={() => setTag(tag === id ? null : id)}>
              <Icon size={16} aria-hidden />
              {label}
            </button>
          ))}
          <button type="button" className="chip ml-auto" onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}>
            <ArrowDownUp size={16} aria-hidden />
            {order === 'desc' ? 'Dal più recente' : 'Dal primo giorno'}
          </button>
        </div>

        {error && <p className="mt-6 text-center italic text-accent-deep" role="alert">{error}</p>}
        {!results && !error && <Loading text="Sfogliamo i ricordi…" />}
        {results?.length === 0 && (
          <p className="mt-12 text-center font-hand text-2xl text-ink-soft">
            {filtering
              ? 'Nessun ricordo corrisponde. Prova con altre parole.'
              : 'Il libro è ancora tutto da scrivere. La prima pagina vi aspetta.'}
          </p>
        )}

        <ol className="mt-3 flex flex-col gap-3" aria-live="polite">
          {results?.map((entry, i) => {
            const month = formatMonth(entry.date);
            const newMonth = i === 0 || formatMonth(results[i - 1].date) !== month;
            return (
              <Fragment key={entry.id}>
                {newMonth && (
                  <li className="mt-4 flex items-center gap-3 first:mt-1" aria-hidden>
                    <span className="h-px flex-1 bg-line" />
                    <span className="label">{month}</span>
                    <span className="h-px flex-1 bg-line" />
                  </li>
                )}
                <li>
                  <MemoryCard entry={entry} />
                </li>
              </Fragment>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
