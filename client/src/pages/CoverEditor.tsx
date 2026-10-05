import { ArrowLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AddBar, type AddRequest } from '../components/cover/AddBar';
import { CoverCanvas } from '../components/cover/CoverCanvas';
import { ItemPanel } from '../components/cover/ItemPanel';
import { useLive } from '../context/Live';
import { useOpenBook, useSession } from '../context/Session';
import { api, errorMessage, uploadMedia } from '../lib/api';
import { createItem, defaultCover, MAX_COVER_ITEMS, topZ } from '../lib/cover';
import type { Book, Cover, CoverItem } from '../lib/types';

const BACK = '/libro?pagina=copertina';

/** Composizione libera della copertina: /copertina. */
export function CoverEditor() {
  const { book } = useOpenBook();
  const { openBook } = useSession();
  const { notify } = useLive();
  const navigate = useNavigate();
  const [cover, setCover] = useState<Cover>(() => book.cover ?? defaultCover());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // File caricati in questa sessione: se li togli prima di salvare vanno eliminati subito.
  const fresh = useRef(new Set<string>());

  const selected = cover.items.find((item) => item.id === selectedId) ?? null;
  const patch = (id: string, change: Record<string, unknown>) =>
    setCover((c) => ({ ...c, items: c.items.map((item) => (item.id === id ? ({ ...item, ...change } as CoverItem) : item)) }));

  const add = (request: AddRequest) => {
    const item = createItem(cover, request);
    setCover((c) => ({ ...c, items: [...c.items, item] }));
    setSelectedId(item.id);
  };

  const remove = (id: string) => {
    const item = cover.items.find((i) => i.id === id);
    setCover((c) => ({ ...c, items: c.items.filter((i) => i.id !== id) }));
    if (item && 'mediaId' in item && fresh.current.delete(item.mediaId)) {
      api(`/media/${item.mediaId}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const addFiles = async (files: File[]) => {
    setError(null);
    const list = files.slice(0, MAX_COVER_ITEMS - cover.items.length);
    for (const [index, file] of list.entries()) {
      setUploading(list.length > 1 ? `Carico ${index + 1} di ${list.length}…` : `Carico ${file.name}…`);
      try {
        const media = await uploadMedia(file, () => {});
        if (media.kind === 'audio') {
          api(`/media/${media.id}`, { method: 'DELETE' }).catch(() => {});
          setError('Le canzoni stanno meglio dentro le pagine: in copertina vanno foto e video.');
          continue;
        }
        fresh.current.add(media.id);
        const draft = { type: media.kind === 'video' ? 'video' : 'photo', mediaId: media.id } as const;
        setCover((c) => {
          const item = createItem(c, draft, { index, total: list.length });
          // Il titolo resta sopra alle foto appena appoggiate: non deve sparire sotto un collage.
          const items = c.items.map((other) => (other.type === 'title' ? { ...other, z: item.z + 1 } : other));
          return { ...c, items: [...items, item] };
        });
      } catch (err) {
        setError(`${file.name}: ${errorMessage(err)}`);
      }
    }
    setUploading(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // L'ordine di sovrapposizione si salva compatto: 1, 2, 3…
      const items = [...cover.items].sort((a, b) => a.z - b.z).map((item, i) => ({ ...item, z: i + 1 }));
      const { book: updated } = await api<{ book: Book }>('/book/cover', { method: 'PUT', body: { ...cover, items } });
      openBook(updated);
      notify('La copertina è al suo posto.');
      navigate(BACK);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const full = cover.items.length >= MAX_COVER_ITEMS;
  return (
    <div className="min-h-dvh pb-16">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-desk/85 px-3 py-2.5 backdrop-blur sm:px-6">
        <Link to={BACK} className="btn btn-ghost px-3" aria-label="Torna al libro senza salvare">
          <ArrowLeft size={19} aria-hidden />
          <span className="hidden sm:inline">Torna al libro</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-semibold italic text-accent-deep sm:text-2xl">
          La vostra copertina
        </h1>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || Boolean(uploading)}>
          {saving ? 'Un attimo…' : 'Salva'}
        </button>
      </header>

      <main className="mx-auto mt-5 grid w-[min(62rem,calc(100%-1.5rem))] gap-5 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
        <div className="sticky top-[4.4rem] z-20 mx-auto w-full max-w-[16.5rem] sm:max-w-[22rem] lg:max-w-none">
          <div className={`cover-fit cover-frame cover-bg-${cover.background}`}>
            <CoverCanvas
              cover={cover}
              book={book}
              editing={{ selectedId, onSelect: setSelectedId, onMove: (id, x, y) => patch(id, { x, y }), onRemove: remove }}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <AddBar
            background={cover.background}
            hasTitle={cover.items.some((item) => item.type === 'title')}
            disabled={full || Boolean(uploading)}
            onFiles={addFiles}
            onAdd={add}
            onBackground={(background) => setCover((c) => ({ ...c, background }))}
          />
          {(uploading || error || full) && (
            <p className="rounded-xl bg-accent-soft px-4 py-2.5 text-center font-semibold text-accent-deep" role={error ? 'alert' : 'status'}>
              {uploading ?? error ?? `La copertina è piena: tiene al massimo ${MAX_COVER_ITEMS} elementi.`}
            </p>
          )}
          {selected ? (
            <ItemPanel
              key={selected.id}
              item={selected}
              onChange={(change) => patch(selected.id, change)}
              onRemove={() => remove(selected.id)}
              onFront={() => patch(selected.id, { z: topZ(cover.items) })}
              onBack={() => patch(selected.id, { z: Math.min(...cover.items.map((i) => i.z)) - 1 })}
            />
          ) : (
            <p className="px-2 text-center italic text-ink-soft">
              Trascina gli elementi per spostarli. Toccane uno per cambiarne grandezza, inclinazione, testo o colore.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
