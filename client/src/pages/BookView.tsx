import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Book } from '../components/book/Book';
import { EntryPage } from '../components/book/EntryPage';
import { IndexPage } from '../components/book/IndexPage';
import { buildPages, pageOfEntry } from '../components/book/model';
import { CoverPage, NextPage } from '../components/book/pages';
import { HeartDoodle } from '../components/Decor';
import { TopBar } from '../components/TopBar';
import { useLive } from '../context/Live';
import { useOpenBook } from '../context/Session';
import { api, errorMessage } from '../lib/api';
import type { Entry } from '../lib/types';

export function Loading({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-ink-soft" role="status">
      <HeartDoodle className="w-10 animate-pulse text-accent" />
      <p className="font-hand text-2xl">{text}</p>
    </div>
  );
}

export function BookView() {
  const { book, partner } = useOpenBook();
  const { entries, upsertEntry, partnerWriting, notify } = useLive();
  const [params, setParams] = useSearchParams();
  const pages = useMemo(() => buildPages(entries ?? []), [entries]);
  const [page, setPage] = useState<number | null>(null);

  // All’apertura: la pagina chiesta dall’indirizzo (?pagina=…), altrimenti l’ultima scritta.
  const wanted = params.get('pagina');
  useEffect(() => {
    if (!entries) return;
    if (wanted) {
      const index = pageOfEntry(pages, wanted);
      setPage((current) => (index >= 0 ? index : (current ?? 0)));
      setParams({}, { replace: true });
    } else if (page === null) {
      const latest = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setPage(latest ? pageOfEntry(pages, latest.id) : 0);
    }
  }, [entries, pages, wanted, page, setParams]);

  const toggleFavorite = useCallback(
    async (entry: Entry) => {
      // Subito sulla pagina; se il salvataggio fallisce si torna indietro.
      upsertEntry({ ...entry, isFavorite: !entry.isFavorite });
      try {
        const saved = await api<{ entry: Entry }>(`/entries/${entry.id}/favorite`, {
          method: 'PATCH',
          body: { isFavorite: !entry.isFavorite },
        });
        upsertEntry(saved.entry);
      } catch (err) {
        upsertEntry(entry);
        notify(errorMessage(err));
      }
    },
    [upsertEntry, notify],
  );

  const renderPage = useCallback(
    (index: number) => {
      const spec = pages[index];
      if (!spec) return null;
      switch (spec.kind) {
        case 'cover':
          return <CoverPage book={book} />;
        case 'index':
          return <IndexPage items={spec.items} first={spec.first} number={index + 1} onJump={setPage} />;
        case 'entry':
          return (
            <EntryPage
              entry={spec.entry}
              number={index + 1}
              partnerEditing={partnerWriting?.entryId === spec.entry.id ? partner : null}
              onToggleFavorite={toggleFavorite}
            />
          );
        case 'next':
          return <NextPage number={index + 1} partnerWriting={partnerWriting?.entryId === null ? partner : null} />;
        case 'blank':
          return null;
      }
    },
    [pages, book, partner, partnerWriting, toggleFavorite],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col items-center justify-center px-3 pb-4 sm:px-6">
        {page === null ? (
          <Loading text="Apriamo il libro…" />
        ) : (
          <Book
            pageCount={pages.length}
            page={Math.min(page, pages.length - 1)}
            onPageChange={setPage}
            renderPage={renderPage}
          />
        )}
      </main>
    </div>
  );
}
