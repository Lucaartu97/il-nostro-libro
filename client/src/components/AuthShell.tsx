import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { Divider, FloatingDecor, HeartDoodle } from './Decor';

/** Cornice delle schermate prima del libro: un foglio al centro, tra cuori e fiori. */
export function AuthShell({ title, back, children }: { title: string; back?: boolean; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-3 py-10">
      <FloatingDecor />
      <main className="card relative w-full max-w-xl px-6 py-8 sm:px-10 sm:py-10">
        {back && (
          <Link to="/" className="icon-btn absolute left-3 top-3" aria-label="Torna all’inizio">
            <ArrowLeft size={20} />
          </Link>
        )}
        <HeartDoodle className="mx-auto w-10 text-accent" />
        <h1 className="mt-2 text-center text-3xl font-semibold italic text-accent-deep sm:text-4xl">{title}</h1>
        <Divider className="mb-6 mt-3" />
        {children}
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-center font-semibold text-accent-deep" role="alert">
      {message}
    </p>
  );
}

interface CodeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** true quando il codice viene scelto, false quando viene inserito per entrare. */
  isNew?: boolean;
  autoFocus?: boolean;
}

/** Campo per la chiave del libro: nascosta mentre la scrivi, ma si può sbirciare. */
export function CodeField({ label, value, onChange, isNew, autoFocus }: CodeFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="mt-1 flex items-end gap-1">
        <input
          className="field text-2xl tracking-wide"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={80}
          minLength={isNew ? 8 : undefined}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="icon-btn"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? 'Nascondi la chiave' : 'Mostra la chiave'}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </span>
    </label>
  );
}
