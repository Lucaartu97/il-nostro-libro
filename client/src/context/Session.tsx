import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { savedAuthor, savedNight } from '../lib/device';
import type { Book } from '../lib/types';

type Slot = 'one' | 'two';

interface SessionValue {
  /** undefined finché non sappiamo se c’è una sessione aperta. */
  book: Book | null | undefined;
  /** Chi sta usando questo dispositivo (null = da scegliere). */
  author: string | null;
  /** L’altra metà della coppia. */
  partner: string | null;
  night: boolean;
  openBook: (book: Book) => void;
  chooseAuthor: (name: string) => void;
  toggleNight: () => void;
  closeBook: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [book, setBook] = useState<Book | null | undefined>(undefined);
  // Ricordiamo il "posto" nella coppia, non il nome: così regge anche se un nome cambia.
  const [slot, setSlot] = useState<Slot | null>(null);
  const [night, setNight] = useState(savedNight.get);

  useEffect(() => {
    api<{ book: Book }>('/book').then(
      ({ book }) => setBook(book),
      () => setBook(null),
    );
  }, []);

  const bookId = book?.id;
  useEffect(() => {
    const saved = bookId ? savedAuthor.get(bookId) : null;
    setSlot(saved === 'one' || saved === 'two' ? saved : null);
  }, [bookId]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = book?.theme ?? 'rosa';
    root.classList.toggle('dark', night);
    const desk = getComputedStyle(root).getPropertyValue('--desk').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', desk);
  }, [book?.theme, night]);

  const chooseAuthor = useCallback(
    (name: string) => {
      if (!book) return;
      const next: Slot = name === book.partnerTwo ? 'two' : 'one';
      savedAuthor.set(book.id, next);
      setSlot(next);
    },
    [book],
  );

  const toggleNight = useCallback(() => {
    setNight((current) => {
      savedNight.set(!current);
      return !current;
    });
  }, []);

  const closeBook = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setBook(null);
  }, []);

  const value = useMemo<SessionValue>(() => {
    const author = book && slot ? (slot === 'one' ? book.partnerOne : book.partnerTwo) : null;
    const partner = book && slot ? (slot === 'one' ? book.partnerTwo : book.partnerOne) : null;
    return { book, author, partner, night, openBook: setBook, chooseAuthor, toggleNight, closeBook };
  }, [book, slot, night, chooseAuthor, toggleNight, closeBook]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession va usato dentro SessionProvider');
  return value;
}

/** Per le schermate che esistono solo a libro aperto e con chi scrive già scelto. */
export function useOpenBook(): { book: Book; author: string; partner: string } {
  const { book, author, partner } = useSession();
  if (!book || !author || !partner) throw new Error('Nessun libro aperto');
  return { book, author, partner };
}
