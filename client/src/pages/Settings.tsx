import { Archive, FileJson, LogOut, Printer } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormError } from '../components/AuthShell';
import { BookFields, type BookForm } from '../components/BookFields';
import { TopBar } from '../components/TopBar';
import { useLive } from '../context/Live';
import { useOpenBook, useSession } from '../context/Session';
import { api, errorMessage } from '../lib/api';
import type { Book } from '../lib/types';

/** Il libro, chi scrive su questo dispositivo, le copie da conservare. */
export function Settings() {
  const { book, author } = useOpenBook();
  const { openBook, chooseAuthor, closeBook } = useSession();
  const { notify } = useLive();
  const navigate = useNavigate();
  const [form, setForm] = useState<BookForm>({
    partnerOne: book.partnerOne,
    partnerTwo: book.partnerTwo,
    coupleName: book.coupleName,
    startDate: book.startDate,
    theme: book.theme,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { book: updated } = await api<{ book: Book }>('/book', { method: 'PATCH', body: form });
      openBook(updated);
      notify('Fatto: il libro è aggiornato.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await closeBook();
    navigate('/');
  };

  const section = 'card rounded-2xl px-5 py-6 shadow-none sm:px-8';
  const heading = 'mb-4 text-2xl font-semibold italic text-accent-deep';
  return (
    <div className="min-h-dvh pb-16">
      <TopBar />
      <main className="mx-auto mt-3 flex w-[min(42rem,calc(100%-1.5rem))] flex-col gap-5">
        <form onSubmit={save} className={`${section} flex flex-col gap-6`}>
          <h1 className={`${heading} mb-0`}>Il vostro libro</h1>
          <BookFields value={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <FormError message={error} />
          <button type="submit" className="btn btn-primary self-start" disabled={busy}>
            {busy ? 'Un attimo…' : 'Salva'}
          </button>
        </form>

        <section className={section}>
          <h2 className={heading}>Su questo dispositivo scrive</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chi scrive su questo dispositivo">
            {[book.partnerOne, book.partnerTwo].map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={author === name}
                className="chip font-hand text-2xl"
                onClick={() => chooseAuthor(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>

        <section className={section}>
          <h2 className={heading}>Una copia da conservare</h2>
          <p className="-mt-2 mb-4 text-ink-soft">I ricordi sono vostri: portateli con voi quando volete.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/stampa" className="btn btn-soft">
              <Printer size={18} aria-hidden />
              Libro in PDF
            </Link>
            <a href="/api/export/zip" download className="btn btn-soft">
              <Archive size={18} aria-hidden />
              Copia completa (ZIP)
            </a>
            <a href="/api/export/json" download className="btn btn-soft">
              <FileJson size={18} aria-hidden />
              Solo i testi (JSON)
            </a>
          </div>
        </section>

        <section className={section}>
          <h2 className={heading}>Chiudere il libro</h2>
          <p className="-mt-2 mb-4 text-ink-soft">
            Le pagine restano al sicuro. Per riaprirlo su questo dispositivo servirà la vostra chiave.
          </p>
          <button type="button" className="btn btn-ghost border border-line" onClick={leave}>
            <LogOut size={18} aria-hidden />
            Chiudi il libro
          </button>
        </section>
      </main>
    </div>
  );
}
