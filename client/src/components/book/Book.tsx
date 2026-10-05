import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { type ReactNode, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';
import { isTyping, useIsWide } from './useIsWide';

interface BookProps {
  pageCount: number;
  /** Indice della pagina che vogliamo vedere (0 = copertina). */
  page: number;
  onPageChange: (page: number) => void;
  /** Contenuto di una pagina (null per gli indici fuori dal libro). */
  renderPage: (index: number) => ReactNode;
}

const EASE = [0.645, 0.045, 0.355, 1] as const;

/**
 * Il libro sfogliabile. Una "vista" è ciò che sta fermo sul tavolo.
 * Su telefono è una pagina sola. Su schermi larghi la vista 0 è il libro chiuso (solo la copertina,
 * a destra); poi ogni vista v è una facciata con le pagine 2v-1 a sinistra e 2v a destra.
 */
export function Book({ pageCount, page, onPageChange, renderPage }: BookProps) {
  const wide = useIsWide();
  const reducedMotion = useReducedMotion();
  const viewOf = (p: number) => (wide ? Math.ceil(p / 2) : p);
  const view = viewOf(page);
  const lastView = viewOf(pageCount - 1);

  const [shown, setShown] = useState(view);
  const [flipTo, setFlipTo] = useState<number | null>(null);

  // Cambiando formato (telefono ruotato, finestra ridimensionata) si riparte da fermi.
  const lastWide = useRef(wide);
  if (lastWide.current !== wide) {
    lastWide.current = wide;
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

  const goToView = useCallback(
    (target: number) => {
      if (flipTo !== null) return;
      const next = Math.min(lastView, Math.max(0, target));
      if (next !== view) onPageChange(wide ? Math.max(0, next * 2 - 1) : next);
    },
    [flipTo, lastView, view, wide, onPageChange],
  );
  const turn = useCallback((delta: number) => goToView(view + delta), [goToView, view]);

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
  const face = (index: number, side: 'left' | 'right' | 'single', back = false) =>
    index < 0 ? null : (
      <div className={`book-page is-${side}${index === 0 ? ' is-cover' : ''}${back ? ' is-back' : ''}`}>
        {renderPage(index)}
      </div>
    );

  let content: ReactNode;
  if (wide) {
    // Sotto restano la pagina sinistra di partenza e la destra di arrivo (o viceversa);
    // il foglio che gira porta le altre due, una per faccia.
    const left = (flipping && !forward ? to : shown) * 2 - 1;
    const right = (flipping && forward ? to : shown) * 2;
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
            {forward ? face(shown * 2, 'right') : face(shown * 2 - 1, 'left')}
            {forward ? face(to * 2 - 1, 'left', true) : face(to * 2, 'right', true)}
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

  // La copertina non si conta: le pagine di carta vanno da 1 a "total".
  const total = pageCount - 1;
  const label =
    to === 0
      ? 'copertina'
      : wide
        ? `pagine ${to * 2 - 1}–${Math.min(to * 2, total)} di ${total}`
        : `pagina ${to} di ${total}`;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="book-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* A libro chiuso la copertina scivola al centro; aprendolo torna al suo posto, a destra. */}
        <motion.div
          className={`book ${wide ? 'is-wide' : 'is-narrow'}`}
          initial={false}
          animate={{ x: wide && to === 0 ? '-25%' : '0%' }}
          transition={{ duration: reducedMotion ? 0 : 0.95, ease: EASE }}
        >
          {content}
        </motion.div>
      </div>
      <nav className="no-print flex items-center gap-1" aria-label="Sfoglia il libro">
        <button type="button" className="icon-btn" onClick={() => goToView(0)} disabled={to === 0} aria-label="Vai alla copertina" title="Copertina">
          <ChevronsLeft size={20} />
        </button>
        <button type="button" className="icon-btn" onClick={() => turn(-1)} disabled={to === 0} aria-label="Pagina precedente">
          <ChevronLeft />
        </button>
        <span className="min-w-36 text-center text-[0.95rem] italic text-ink-soft" aria-live="polite">
          {label}
        </span>
        <button type="button" className="icon-btn" onClick={() => turn(1)} disabled={to >= lastView} aria-label="Pagina successiva">
          <ChevronRight />
        </button>
        <button type="button" className="icon-btn" onClick={() => goToView(lastView)} disabled={to >= lastView} aria-label="Vai all’ultima pagina" title="Ultima pagina">
          <ChevronsRight size={20} />
        </button>
      </nav>
    </div>
  );
}
