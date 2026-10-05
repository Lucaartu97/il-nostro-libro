import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell, CodeField, FormError } from '../components/AuthShell';
import { useSession } from '../context/Session';
import { api, errorMessage } from '../lib/api';
import type { Book } from '../lib/types';

/** Accesso con la chiave condivisa della coppia. */
export function Login() {
  const { openBook } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { book } = await api<{ book: Book }>('/auth/login', { body: { code } });
      openBook(book);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Bentornati" back>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <p className="-mt-2 text-center font-hand text-2xl text-ink-soft">Il vostro libro vi stava aspettando.</p>
        <CodeField label="La vostra chiave" value={code} onChange={setCode} autoFocus />
        <FormError message={error} />
        <button type="submit" className="btn btn-primary text-xl" disabled={busy || !code.trim()}>
          {busy ? 'Cerchiamo il vostro libro…' : 'Apri il libro'}
        </button>
        <p className="text-center text-[0.98rem] italic text-ink-soft">
          Non avete ancora un libro?{' '}
          <Link to="/nuovo" className="font-semibold text-accent-deep underline underline-offset-4">
            Iniziatelo adesso
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
