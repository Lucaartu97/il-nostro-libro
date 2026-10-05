import { Moon, PenLine, Search, Settings, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLive } from '../context/Live';
import { useOpenBook, useSession } from '../context/Session';
import { togetherLabel } from '../lib/format';
import { HeartDoodle } from './Decor';

function Presence() {
  const { partner } = useOpenBook();
  const { partnerOnline, partnerWriting } = useLive();
  if (!partnerOnline) return null;
  const text = partnerWriting ? `${partner} sta scrivendo…` : `${partner} è qui con te`;
  return (
    <span
      className="flex items-center gap-2 rounded-full bg-accent-soft px-2.5 py-1.5 text-[0.92rem] font-semibold italic text-accent-deep md:px-3.5"
      title={text}
      role="status"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <span className="hidden md:inline">{text}</span>
      <span className="sr-only md:hidden">{text}</span>
    </span>
  );
}

/** Barra in alto delle schermate a libro aperto. */
export function TopBar() {
  const { book } = useOpenBook();
  const { night, toggleNight } = useSession();
  return (
    <header className="no-print flex items-center gap-1 px-3 py-2.5 sm:gap-2 sm:px-6">
      <Link to="/libro" className="flex min-w-0 items-center gap-2.5 rounded-xl pr-2">
        <HeartDoodle className="w-7 flex-none text-accent" />
        <span className="min-w-0">
          <span className="block truncate text-xl font-semibold italic leading-tight">{book.coupleName}</span>
          <span className="block truncate text-[0.85rem] leading-tight text-ink-soft">{togetherLabel(book.startDate)}</span>
        </span>
      </Link>
      <div className="flex-1" />
      <Presence />
      <Link to="/ricordi" className="icon-btn" aria-label="Cerca tra i ricordi" title="Cerca tra i ricordi">
        <Search size={20} />
      </Link>
      <button
        type="button"
        className="icon-btn"
        onClick={toggleNight}
        aria-pressed={night}
        aria-label={night ? 'Torna alla luce del giorno' : 'Lettura a lume di candela'}
        title={night ? 'Torna alla luce del giorno' : 'Lettura a lume di candela'}
      >
        {night ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <Link to="/impostazioni" className="icon-btn" aria-label="Il vostro libro: impostazioni" title="Impostazioni">
        <Settings size={20} />
      </Link>
      <Link to="/scrivi" className="btn btn-primary ml-1 px-3 sm:px-5" aria-label="Scrivi una pagina">
        <PenLine size={18} aria-hidden />
        <span className="hidden sm:inline">Scrivi</span>
      </Link>
    </header>
  );
}
