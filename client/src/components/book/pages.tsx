import { PenLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, togetherLabel } from '../../lib/format';
import type { Book } from '../../lib/types';
import { Divider, FlowerDoodle, HeartDoodle, SprigDoodle, StarDoodle } from '../Decor';

export function PageShell({ number, children }: { number?: number; children: ReactNode }) {
  return (
    <>
      <div className="page-scroll">{children}</div>
      <div className="page-fade" />
      {number !== undefined && <div className="page-number">· {number} ·</div>}
    </>
  );
}

export function TypingNote({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-2 bg-accent-soft/80 italic text-accent-deep ${className}`}>
      <span className="typing-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {children}
    </p>
  );
}

export function CoverPage({ book }: { book: Book }) {
  return (
    <PageShell>
      <div className="flex min-h-full flex-col items-center justify-center gap-4 py-4 text-center">
        <HeartDoodle className="w-12 text-accent" />
        <p className="label">Il libro di</p>
        <h1 className="text-4xl font-semibold italic leading-tight text-accent-deep sm:text-5xl">{book.coupleName}</h1>
        <Divider />
        <p className="max-w-[22rem] font-hand text-[1.7rem] leading-snug">
          {book.partnerOne} e {book.partnerTwo}, ecco il libro della vostra storia. Ogni pagina è un giorno che avete
          scelto di non lasciar andare.
        </p>
        <p className="mt-2 text-[0.95rem] italic text-ink-soft">
          dal {formatDate(book.startDate)} · {togetherLabel(book.startDate)}
        </p>
        <SprigDoodle className="mt-1 w-9 text-gold/70" />
      </div>
    </PageShell>
  );
}

export function NextPage({ number, partnerWriting }: { number: number; partnerWriting: string | null }) {
  return (
    <PageShell number={number}>
      <div className="flex min-h-full flex-col items-center justify-center gap-4 py-4 text-center">
        <div className="flex items-end gap-3 text-accent/70">
          <StarDoodle className="w-7 text-gold/70" />
          <FlowerDoodle className="w-10" />
          <HeartDoodle className="w-7" />
        </div>
        <h2 className="text-3xl font-semibold italic text-accent-deep">Che momento vuoi conservare oggi?</h2>
        <p className="max-w-[20rem] font-hand text-2xl leading-snug text-ink-soft">
          Questa pagina è ancora bianca. Basta un pensiero, una foto, una canzone.
        </p>
        {partnerWriting && (
          <TypingNote className="rounded-full px-4 py-2">{partnerWriting} sta scrivendo una pagina nuova</TypingNote>
        )}
        <Link to="/scrivi" className="btn btn-primary no-print mt-1">
          <PenLine size={18} aria-hidden />
          Scrivi una pagina
        </Link>
      </div>
    </PageShell>
  );
}
