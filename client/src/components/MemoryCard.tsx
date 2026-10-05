import { Paperclip, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate, htmlToText } from '../lib/format';
import type { Entry } from '../lib/types';
import { TagBadge } from './TagBadge';

/** Un ricordo nella vista cronologica: porta alla sua pagina nel libro. */
export function MemoryCard({ entry }: { entry: Entry }) {
  const excerpt = htmlToText(entry.contentHtml);
  return (
    <Link
      to={`/libro?pagina=${entry.id}`}
      className="card block rounded-2xl px-4 py-3.5 shadow-none transition-transform hover:-translate-y-0.5 hover:border-accent sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <time dateTime={entry.date} className="label">
          {formatDate(entry.date)}
        </time>
        <TagBadge tag={entry.tag} />
        <span className="flex-1" />
        {entry.media.length > 0 && (
          <span className="flex items-center gap-1 text-[0.85rem] text-ink-soft" title="Foto, musica o video">
            <Paperclip size={14} aria-hidden />
            {entry.media.length}
            <span className="sr-only"> contenuti allegati</span>
          </span>
        )}
        {entry.isFavorite && <Star size={17} className="fill-gold text-gold" aria-label="Momento speciale" />}
      </div>
      <h3 className="mt-1 text-[1.45rem] font-semibold leading-snug text-accent-deep">{entry.title}</h3>
      {excerpt && <p className="mt-0.5 line-clamp-2 font-hand text-[1.35rem] leading-snug">{excerpt}</p>}
      <p className="mt-1 text-right font-hand text-xl text-ink-soft">— {entry.author}</p>
    </Link>
  );
}
