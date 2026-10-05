import { Music, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Media } from '../lib/types';

function Lightbox({ src, caption, onClose }: { src: string; caption: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fuori dal libro: le pagine sono trasformate in 3D e intrappolerebbero un elemento "fixed".
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={caption || 'Fotografia'}
    >
      <button type="button" className="icon-btn absolute right-3 top-3 text-white/80 hover:text-white" aria-label="Chiudi">
        <X />
      </button>
      <img src={src} alt={caption} className="max-h-[82dvh] max-w-full rounded object-contain shadow-2xl" />
      {caption && <p className="font-hand text-2xl text-white/90">{caption}</p>}
    </div>,
    document.body,
  );
}

function Photo({ media, eager, tilt }: { media: Media; eager?: boolean; tilt: number }) {
  const [open, setOpen] = useState(false);
  const src = media.url ?? media.externalRef ?? '';
  return (
    <figure className="mx-auto w-fit max-w-full" style={{ transform: `rotate(${tilt}deg)` }}>
      <button type="button" className="photo-frame" onClick={() => setOpen(true)} aria-label="Ingrandisci la foto">
        <img
          src={src}
          alt={media.caption || media.originalName || 'Fotografia'}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="max-h-72 max-w-full rounded-[2px] object-contain"
        />
        {media.caption && (
          <figcaption className="px-1 pt-1.5 text-center font-hand text-xl leading-tight text-[#4b2e35] dark:text-[#f1e3d3]">
            {media.caption}
          </figcaption>
        )}
      </button>
      {open && <Lightbox src={src} caption={media.caption} onClose={() => setOpen(false)} />}
    </figure>
  );
}

function Captioned({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure>
      {children}
      {caption && <figcaption className="mt-1 text-center font-hand text-xl text-ink-soft">{caption}</figcaption>}
    </figure>
  );
}

/** Mostra un contenuto multimediale dentro una pagina del libro. */
export function MediaView({ media, eager, index = 0 }: { media: Media; eager?: boolean; index?: number }) {
  switch (media.kind) {
    case 'image':
    case 'gif':
      return <Photo media={media} eager={eager} tilt={index % 2 === 0 ? -1.2 : 1} />;
    case 'video':
      return (
        <Captioned caption={media.caption}>
          <video src={media.url ?? undefined} controls playsInline preload="metadata" className="w-full rounded-lg bg-black/80" />
        </Captioned>
      );
    case 'audio':
      return (
        <Captioned caption={media.caption}>
          <div className="rounded-2xl border border-line bg-accent-soft/50 p-3">
            <p className="mb-2 flex items-center gap-2 text-[0.95rem] font-semibold text-accent-deep">
              <Music size={16} aria-hidden />
              <span className="truncate">{media.originalName ?? 'Una canzone'}</span>
            </p>
            <audio src={media.url ?? undefined} controls preload="none" className="w-full" />
          </div>
        </Captioned>
      );
    case 'youtube':
      return (
        <Captioned caption={media.caption}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${media.externalRef}`}
            title={media.caption || 'Video YouTube'}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full rounded-lg border-0 bg-black/80"
          />
        </Captioned>
      );
    case 'spotify': {
      const compact = /^(track|episode)\//.test(media.externalRef ?? '');
      return (
        <Captioned caption={media.caption}>
          <iframe
            src={`https://open.spotify.com/embed/${media.externalRef}`}
            title={media.caption || 'Canzone su Spotify'}
            loading="lazy"
            allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"
            height={compact ? 152 : 352}
            className="w-full rounded-xl border-0"
          />
        </Captioned>
      );
    }
  }
}

export function MediaList({ items, eager }: { items: Media[]; eager?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="mt-5 flex flex-col gap-5">
      {items.map((media, index) => (
        <MediaView key={media.id} media={media} eager={eager} index={index} />
      ))}
    </div>
  );
}
