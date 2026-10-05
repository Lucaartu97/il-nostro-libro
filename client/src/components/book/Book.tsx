import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, type TouchEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

interface BookProps {
  pageCount: number;
  /** Indice della pagina che vogliamo vedere. */
  page: number;
  onPageChange: (page: number) => void;
  /** Contenuto di una pagina (null per gli indici fuori dal libro). */
  renderPage: (index: number) => ReactNode;
}

const EASE = [0.645, 0.045, 0.355, 1] as const;
const WIDE = '(min-width: 900px)';

function useIsWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia(WIDE).matches,
  );
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/**
 * Il libro sfogliabile. Su schermi larghi mostra due pagine affiancate, su telefono una sola.
 * Una "vista" è ciò che sta fermo sul tavolo: una facciata doppia oppure una pagina singola.
 */
export function Book({ pageCount, page, onPageChange, renderPage }: BookProps) {
  const wide = useIsWide();
  const reducedMotion = useReducedMotion();
  const step = wide ? 2 : 1;
  const view = Math.floor(page / step);
  const lastView = Math.floor((pageCount - 1) / step);

  const [shown, setShown] = useState(view);
  const [flipTo, setFlipTo] = useState<number | null>(null);

  // Cambiando formato (telefono ruotato, finestra ridimensionata) si riparte da fermi.
  const lastStep = useRef(step);
  if (lastStep.current !== step) {
    lastStep.current = step;
    setShown(view);
    setFlipTo(null);
  }

  useEffect(() => {
    if (flipTo !== null || shown === view) return;
    if (reducedMotion) setShown(view);
    else setFlipTo(view);
  }, [view, shown, flipTo, reducedMotion]);

  const finishFlip = () => {
    if (flipTo !== null) setShown(flipTo);
    setFlipTo(null);
  };

  const turn = useCallback(
    (delta: number) => {
      if (flipTo !== null) return;
      const next = Math.min(lastView, Math.max(0, view + delta));
      if (next !== view) onPageChange(next * step);
    },
    [flipTo, lastView, view, step, onPageChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === 'ArrowRight') turn(1);
      if (e.key === 'ArrowLeft') turn(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) turn(dx < 0 ? 1 : -1);
  };

  const flipping = flipTo !== null;
  const to = flipTo ?? shown;
  const forward = to > shown;
  const face = (index: number, side: 'left' | 'right' | 'single', back = false) => (
    <div className={`book-page is-${side}${back ? ' is-back' : ''}`}>{renderPage(index)}</div>
  );

  let content: ReactNode;
  if (wide) {
    // Sotto restano la pagina sinistra di partenza e la destra di arrivo (o viceversa);
    // il foglio che gira porta le altre due, una per faccia.
    const left = flipping && !forward ? to * 2 : shown * 2;
    const right = flipping && forward ? to * 2 + 1 : shown * 2 + 1;
    content = (
      <>
        {face(left, 'left')}
        {face(right, 'right')}
        {flipping && (
          <motion.div
            key={`${shown}>${to}`}
            className="book-leaf"
            style={{ left: forward ? '50%' : 0, width: '50%', transformOrigin: forward ? 'left center' : 'right center' }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: forward ? -180 : 180 }}
            transition={{ duration: 0.95, ease: EASE }}
            onAnimationComplete={finishFlip}
          >
            {forward ? face(shown * 2 + 1, 'right') : face(shown * 2, 'left')}
            {forward ? face(to * 2, 'left', true) : face(to * 2 + 1, 'right', true)}
          </motion.div>
        )}
      </>
    );
  } else {
    // Pagina singola: il foglio si solleva attorno alla rilegatura e scopre (o ricopre) quello sotto.
    content = (
      <>
        {face(flipping && forward ? to : shown, 'single')}
        {flipping && (
          <motion.div
            key={`${shown}>${to}`}
            className="book-leaf"
            style={{ left: 0, width: '100%', transformOrigin: 'left center' }}
            initial={{ rotateY: forward ? 0 : -100 }}
            animate={{ rotateY: forward ? -100 : 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            onAnimationComplete={finishFlip}
          >
            {face(forward ? shown : to, 'single')}
          </motion.div>
        )}
      </>
    );
  }

  const first = to * step + 1;
  const label = wide
    ? `pagine ${first}–${Math.min(first + 1, pageCount)} di ${pageCount}`
    : `pagina ${first} di ${pageCount}`;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="book-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`book ${wide ? 'is-wide' : 'is-narrow'}`}>{content}</div>
      </div>
      <nav className="no-print flex items-center gap-2" aria-label="Sfoglia il libro">
        <button type="button" className="icon-btn" onClick={() => turn(-1)} disabled={to === 0} aria-label="Pagina precedente">
          <ChevronLeft />
        </button>
        <span className="min-w-36 text-center text-[0.95rem] italic text-ink-soft" aria-live="polite">
          {label}
        </span>
        <button type="button" className="icon-btn" onClick={() => turn(1)} disabled={to >= lastView} aria-label="Pagina successiva">
          <ChevronRight />
        </button>
      </nav>
    </div>
  );
}
