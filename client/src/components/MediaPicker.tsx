import { ImagePlus, Link2, X } from 'lucide-react';
import { type Dispatch, type SetStateAction, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { Media } from '../lib/types';
import { mediaLabel, MediaThumb } from './MediaThumb';
import { ACCEPTED_FILES, MAX_UPLOAD_MB, useMediaUploads } from './useMediaUploads';

interface MediaPickerProps {
  items: Media[];
  setItems: Dispatch<SetStateAction<Media[]>>;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}

/** Foto, video, canzoni e GIF da attaccare alla pagina. */
export function MediaPicker({ items, setItems, onBusyChange, disabled }: MediaPickerProps) {
  const { uploads, dismissUpload, onDrop, addLink, remove } = useMediaUploads(setItems, onBusyChange);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxSize: MAX_UPLOAD_MB * 1024 * 1024,
    disabled,
  });

  const submitLink = async () => {
    if (!link.trim() || linkBusy) return;
    setLinkBusy(true);
    const problem = await addLink(link);
    setLinkBusy(false);
    setLinkError(problem);
    if (!problem) setLink('');
  };

  const setCaption = (id: string, caption: string) =>
    setItems((list) => list.map((m) => (m.id === id ? { ...m, caption } : m)));

  return (
    <section aria-label="Foto, musica e video">
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragActive ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent hover:bg-accent-soft/40'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} aria-label="Scegli i file da aggiungere" />
        <ImagePlus className="text-accent" size={28} aria-hidden />
        <p className="font-semibold">
          {isDragActive ? 'Lasciali pure qui' : 'Trascina qui foto, GIF, video o una canzone'}
        </p>
        <p className="text-[0.9rem] italic text-ink-soft">oppure tocca per sceglierli · fino a {MAX_UPLOAD_MB} MB ciascuno</p>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <Link2 className="mb-2.5 flex-none text-ink-soft" size={20} aria-hidden />
        <input
          className="field"
          type="url"
          inputMode="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void submitLink())}
          placeholder="Incolla un link di Spotify, YouTube o una GIF di Giphy"
          aria-label="Link di una canzone, di un video o di una GIF"
          disabled={disabled}
        />
        <button type="button" className="btn btn-soft min-h-10 flex-none px-4 py-1" onClick={submitLink} disabled={disabled || linkBusy || !link.trim()}>
          Aggiungi
        </button>
      </div>
      {linkError && <p className="mt-1.5 pl-7 text-[0.95rem] italic text-accent-deep" role="alert">{linkError}</p>}

      {(items.length > 0 || uploads.length > 0) && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {items.map((media) => (
            <li key={media.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
              <MediaThumb media={media} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9rem] font-semibold text-ink-soft">{mediaLabel(media)}</p>
                <input
                  className="field py-0.5 font-hand text-xl"
                  value={media.caption}
                  maxLength={200}
                  onChange={(e) => setCaption(media.id, e.target.value)}
                  placeholder="Una didascalia, se vuoi"
                  aria-label={`Didascalia per ${mediaLabel(media)}`}
                  disabled={disabled}
                />
              </div>
              <button type="button" className="icon-btn" onClick={() => remove(media)} disabled={disabled} aria-label={`Togli ${mediaLabel(media)}`}>
                <X size={18} />
              </button>
            </li>
          ))}
          {uploads.map((upload) => (
            <li key={upload.key} className="rounded-xl border border-line p-3" role={upload.error ? 'alert' : 'status'}>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[0.95rem] font-semibold">{upload.name}</p>
                {upload.error ? (
                  <button type="button" className="icon-btn -my-2" onClick={() => dismissUpload(upload.key)} aria-label="Ho capito">
                    <X size={18} />
                  </button>
                ) : (
                  <span className="text-[0.9rem] tabular-nums text-ink-soft">{Math.round(upload.progress * 100)}%</span>
                )}
              </div>
              {upload.error ? (
                <p className="text-[0.95rem] italic text-accent-deep">{upload.error}</p>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${upload.progress * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
