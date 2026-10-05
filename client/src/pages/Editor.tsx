import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Divider } from '../components/Decor';
import { DeletePage, SavedOverlay } from '../components/EditorBits';
import { EntryFields, type Fields } from '../components/EntryFields';
import { MediaPicker } from '../components/MediaPicker';
import { RichText } from '../components/RichText';
import { useEntryLock } from '../components/useEntryLock';
import { useLive } from '../context/Live';
import { useOpenBook } from '../context/Session';
import { api, errorMessage } from '../lib/api';
import { savedDraft } from '../lib/device';
import { todayIso } from '../lib/format';
import type { Entry, EntryInput, Tag } from '../lib/types';
import { Loading } from './BookView';

function EditorForm({ entry }: { entry?: Entry }) {
  const { book, author } = useOpenBook();
  const { upsertEntry, removeEntry } = useLive();
  const navigate = useNavigate();
  const lockedBy = useEntryLock(entry?.id);

  // Pagina nuova: si riparte dalla bozza lasciata su questo dispositivo, se c’è.
  const [draft] = useState(() => (entry ? null : savedDraft.get(book.id)));
  const [fields, setFields] = useState<Fields>({
    date: entry?.date ?? draft?.date ?? todayIso(),
    title: entry?.title ?? draft?.title ?? '',
    tag: entry?.tag ?? (draft?.tag as Tag | undefined) ?? 'giornata',
    author: entry?.author ?? author,
    isFavorite: entry?.isFavorite ?? false,
  });
  const [html, setHtml] = useState(entry?.contentHtml ?? draft?.contentHtml ?? '');
  const [media, setMedia] = useState(entry?.media ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const change = useCallback((patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch })), []);

  useEffect(() => {
    if (entry || savedId) return;
    const timer = setTimeout(() => {
      const { date, title, tag } = fields;
      savedDraft.set(book.id, title || html ? { date, title, tag, contentHtml: html } : null);
    }, 500);
    return () => clearTimeout(timer);
  }, [entry, savedId, book.id, fields, html]);

  useEffect(() => {
    if (!savedId) return;
    const timer = setTimeout(() => navigate(`/libro?pagina=${savedId}`), 1300);
    return () => clearTimeout(timer);
  }, [savedId, navigate]);

  const save = async () => {
    if (!fields.title.trim()) {
      setError('Dai un titolo a questa pagina: basta anche una parola.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: EntryInput = {
      ...fields,
      contentHtml: html,
      media: media.map((m) => ({ id: m.id, caption: m.caption })),
    };
    try {
      const { entry: saved } = await api<{ entry: Entry }>(entry ? `/entries/${entry.id}` : '/entries', {
        method: entry ? 'PUT' : 'POST',
        body,
      });
      upsertEntry(saved);
      if (!entry) savedDraft.set(book.id, null);
      setSavedId(saved.id);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const tearOut = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await api(`/entries/${entry.id}`, { method: 'DELETE' });
      removeEntry(entry.id);
      navigate('/libro');
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const readOnly = Boolean(lockedBy);
  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-desk/85 px-3 py-2.5 backdrop-blur sm:px-6">
        <Link to={entry ? `/libro?pagina=${entry.id}` : '/libro'} className="btn btn-ghost px-3">
          <ArrowLeft size={19} aria-hidden />
          <span className="hidden sm:inline">Torna al libro</span>
          <span className="sr-only sm:hidden">Torna al libro</span>
        </Link>
        <div className="flex-1" />
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || uploading || readOnly}>
          {saving ? 'Un attimo…' : uploading ? 'Carico i file…' : entry ? 'Salva le modifiche' : 'Custodisci la pagina'}
        </button>
      </header>

      <main className="mx-auto mt-5 w-[min(46rem,calc(100%-1.5rem))]">
        {lockedBy && (
          <p className="mb-4 rounded-2xl bg-accent-soft px-4 py-3 text-center italic text-accent-deep" role="status">
            {lockedBy} sta scrivendo questa pagina proprio adesso. Potrai ritoccarla appena avrà finito.
          </p>
        )}
        <div className="card px-5 py-7 sm:px-10 sm:py-9">
          <h1 className="text-center text-3xl font-semibold italic text-accent-deep">
            {entry ? 'Ritocca questa pagina' : 'Che momento vuoi conservare oggi?'}
          </h1>
          <Divider className="mb-6 mt-2" />
          {draft && (draft.title || draft.contentHtml) && (
            <p className="-mt-2 mb-5 text-center text-[0.95rem] italic text-ink-soft">
              Abbiamo ritrovato la pagina che avevi lasciato a metà.
            </p>
          )}
          <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
            <EntryFields book={book} value={fields} onChange={change} />
            <RichText
              initialHtml={html}
              onChange={setHtml}
              editable={!readOnly}
              placeholder="Racconta com’è andata, come se glielo dicessi a voce…"
            />
            <MediaPicker items={media} setItems={setMedia} onBusyChange={setUploading} disabled={readOnly} />
          </fieldset>
          {error && (
            <p className="mt-5 rounded-xl bg-accent-soft px-4 py-2.5 text-center font-semibold text-accent-deep" role="alert">
              {error}
            </p>
          )}
        </div>
        {entry && (
          <div className="mt-6 flex justify-center">
            <DeletePage onConfirm={tearOut} disabled={saving || readOnly} />
          </div>
        )}
      </main>
      {savedId && <SavedOverlay />}
    </div>
  );
}

/** Editor a piena pagina: /scrivi (pagina nuova) e /scrivi/:id (ritocco). */
export function Editor() {
  const { id } = useParams();
  const { entries } = useLive();
  // Fotografiamo la pagina in apertura: ciò che arriva dopo dal partner non deve azzerare ciò che scrivi.
  const [entry, setEntry] = useState<Entry | null | undefined>(undefined);
  useEffect(() => {
    if (entries && entry === undefined) setEntry(id ? (entries.find((e) => e.id === id) ?? null) : null);
  }, [entries, entry, id]);

  if (entry === undefined) return <Loading text="Prepariamo carta e penna…" />;
  if (id && !entry) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-hand text-3xl">Questa pagina non è più nel libro.</p>
        <Link to="/libro" className="btn btn-soft">
          Torna al libro
        </Link>
      </div>
    );
  }
  return <EditorForm key={id ?? 'nuova'} entry={entry ?? undefined} />;
}
