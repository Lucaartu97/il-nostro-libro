import { ArrowLeft, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CoverCanvas } from '../components/cover/CoverCanvas';
import { Divider, HeartDoodle } from '../components/Decor';
import { mediaLabel } from '../components/MediaThumb';
import { TagBadge } from '../components/TagBadge';
import { useLive } from '../context/Live';
import { useOpenBook } from '../context/Session';
import { defaultCover } from '../lib/cover';
import { formatDate, formatFullDate, togetherLabel } from '../lib/format';
import type { Media } from '../lib/types';
import { Loading } from './BookView';

function PrintMedia({ media }: { media: Media }) {
  if (media.kind === 'image' || media.kind === 'gif') {
    return (
      <figure className="mx-auto mt-4 w-fit max-w-full">
        <img src={media.url ?? media.externalRef ?? ''} alt={media.caption} className="max-h-80 max-w-full rounded object-contain" />
        {media.caption && <figcaption className="mt-1 text-center font-hand text-xl text-ink-soft">{media.caption}</figcaption>}
      </figure>
    );
  }
  // Musica e video non si stampano: sulla carta ne resta la traccia.
  return (
    <p className="mt-3 text-[0.95rem] italic text-ink-soft">
      ♪ {mediaLabel(media)}
      {media.caption && ` — ${media.caption}`}
    </p>
  );
}

/** Tutto il libro in colonna, pronto per la stampa o per «Salva come PDF». */
export function PrintView() {
  const { book } = useOpenBook();
  const { entries } = useLive();
  if (!entries) return <Loading text="Raccogliamo le pagine…" />;
  const cover = book.cover ?? defaultCover();

  return (
    <div className="mx-auto w-[min(44rem,calc(100%-1.5rem))] py-5">
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        <Link to="/impostazioni" className="btn btn-ghost px-3">
          <ArrowLeft size={19} aria-hidden />
          Indietro
        </Link>
        <div className="flex-1" />
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={18} aria-hidden />
          Stampa o salva in PDF
        </button>
      </div>
      <p className="no-print mb-6 text-center italic text-ink-soft">
        Nella finestra di stampa scegli «Salva come PDF» per avere il libro in un unico file. Video e canzoni restano nel
        libro online: sulla carta ne resta il titolo.
      </p>

      <div className="print-break mx-auto mb-5 w-full max-w-[24rem]">
        <div className={`cover-fit cover-frame cover-bg-${cover.background}`}>
          <CoverCanvas cover={cover} book={book} />
        </div>
      </div>

      <section className="card print-sheet print-break flex flex-col items-center gap-4 px-8 py-16 text-center">
        <HeartDoodle className="w-12 text-accent" />
        <p className="label">Il libro di</p>
        <h1 className="text-5xl font-semibold italic text-accent-deep">{book.coupleName}</h1>
        <Divider />
        <p className="font-hand text-2xl">
          dal {formatDate(book.startDate)} · {togetherLabel(book.startDate)}
        </p>
        <p className="text-[0.95rem] italic text-ink-soft">
          {entries.length === 1 ? 'Una pagina' : `${entries.length} pagine`}, scritte da {book.partnerOne} e {book.partnerTwo}
        </p>
      </section>

      {entries.map((entry) => (
        <article key={entry.id} className="card print-sheet print-entry mt-5 px-6 py-7 sm:px-9">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <time dateTime={entry.date} className="label">
              {formatFullDate(entry.date)}
            </time>
            <TagBadge tag={entry.tag} />
            {entry.isFavorite && <span className="text-gold" aria-label="Momento speciale">★</span>}
          </div>
          <h2 className="mb-2 mt-1 text-3xl font-semibold text-accent-deep">{entry.title}</h2>
          {entry.contentHtml && <div className="prose-hand" dangerouslySetInnerHTML={{ __html: entry.contentHtml }} />}
          {entry.media.map((media) => (
            <PrintMedia key={media.id} media={media} />
          ))}
          <p className="mt-4 text-right font-hand text-2xl text-ink-soft">— {entry.author}</p>
        </article>
      ))}
    </div>
  );
}
