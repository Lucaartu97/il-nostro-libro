import { Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { defaultCover } from '../../lib/cover';
import type { Book } from '../../lib/types';
import { CoverCanvas } from './CoverCanvas';

/** La copertina dentro il libro: la prima cosa che si vede, a libro chiuso. */
export function CoverPage({ book }: { book: Book }) {
  const cover = book.cover ?? defaultCover();
  return (
    <>
      <div className={`cover-fit cover-bg-${cover.background}`}>
        <CoverCanvas cover={cover} book={book} />
      </div>
      <Link to="/copertina" className="cover-edit no-print">
        <Palette size={16} aria-hidden />
        Personalizza
      </Link>
    </>
  );
}
