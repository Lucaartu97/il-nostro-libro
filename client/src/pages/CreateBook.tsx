import { type FormEvent, useEffect, useState } from 'react';
import { AuthShell, CodeField, FormError } from '../components/AuthShell';
import { BookFields, type BookForm } from '../components/BookFields';
import { useSession } from '../context/Session';
import { api, errorMessage } from '../lib/api';
import { todayIso } from '../lib/format';
import type { Book } from '../lib/types';

/** Creazione del «Libro della Nostra Storia». */
export function CreateBook() {
  const { openBook } = useSession();
  const [form, setForm] = useState<BookForm>({
    partnerOne: '',
    partnerTwo: '',
    coupleName: '',
    startDate: todayIso(),
    theme: 'rosa',
  });
  // Finché non lo tocchi, il titolo segue i due nomi.
  const [titleTouched, setTitleTouched] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = (patch: Partial<BookForm>) => {
    if (patch.coupleName !== undefined) setTitleTouched(true);
    setForm((current) => {
      const next = { ...current, ...patch };
      if (!titleTouched && patch.coupleName === undefined) {
        next.coupleName = [next.partnerOne.trim(), next.partnerTwo.trim()].filter(Boolean).join(' & ');
      }
      return next;
    });
  };

  // Anteprima del colore scelto, prima ancora che il libro esista.
  useEffect(() => {
    document.documentElement.dataset.theme = form.theme;
  }, [form.theme]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { book } = await api<{ book: Book }>('/books', { body: { ...form, code } });
      openBook(book);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Il libro della vostra storia" back>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <BookFields value={form} onChange={change} />
        <div>
          <CodeField label="La vostra chiave segreta" value={code} onChange={setCode} isNew />
          <p className="mt-2 text-[0.95rem] italic leading-snug text-ink-soft">
            Almeno 8 caratteri, per esempio una frase che conoscete solo voi. Sceglietela insieme e custoditela: apre il
            libro da qualsiasi dispositivo e non si può recuperare se la dimenticate.
          </p>
        </div>
        <FormError message={error} />
        <button type="submit" className="btn btn-primary text-xl" disabled={busy}>
          {busy ? 'Rileghiamo le pagine…' : 'Aprite il libro'}
        </button>
      </form>
    </AuthShell>
  );
}
