import { PenLine, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatFullDate } from '../../lib/format';
import type { Entry } from '../../lib/types';
import { MediaList, splitMedia } from '../MediaView';
import { TagBadge } from '../TagBadge';
import { PageShell, TypingNote } from './pages';

interface EntryPageProps {
  entry: Entry;
  number: number;
  /** Nome del partner, se la sta ritoccando proprio ora. */
  partnerEditing: string | null;
  onToggleFavorite: (entry: Entry) => void;
}

export function EntryPage({ entry, number, partnerEditing, onToggleFavorite }: EntryPageProps) {
  const { songs, rest } = splitMedia(entry.media);
  return (
    <PageShell number={number}>
      <article>
        <header className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5">
              <time dateTime={entry.date} className="label">
                {formatFullDate(entry.date)}
              </time>
              <TagBadge tag={entry.tag} />
            </div>
            <div className="no-print -mr-2 -mt-1 flex flex-none">
              <button
                type="button"
                className="icon-btn"
                onClick={() => onToggleFavorite(entry)}
                aria-pressed={entry.isFavorite}
                aria-label={entry.isFavorite ? 'Togli dai momenti preferiti' : 'Segna come momento preferito'}
              >
                {/* La chiave fa ripartire il battito ogni volta che la stella si accende. */}
                <Star
                  key={String(entry.isFavorite)}
                  size={21}
                  className={entry.isFavorite ? 'animate-heartbeat fill-gold text-gold' : ''}
                />
              </button>
              <Link to={`/scrivi/${entry.id}`} className="icon-btn" aria-label="Ritocca questa pagina">
                <PenLine size={19} />
              </Link>
            </div>
          </div>
          <h2 className="mt-1 text-[1.9rem] font-semibold leading-tight text-accent-deep">{entry.title}</h2>
        </header>

        {partnerEditing && (
          <TypingNote className="mb-3 rounded-xl px-3 py-1.5 text-[0.95rem]">
            {partnerEditing} sta ritoccando questa pagina
          </TypingNote>
        )}

        <MediaList items={songs} className="mb-4" />
        {entry.contentHtml && <div className="prose-hand" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />}
        <MediaList items={rest} />
        <p className="mt-5 text-right font-hand text-2xl text-ink-soft">— {entry.author}</p>
      </article>
    </PageShell>
  );
}
