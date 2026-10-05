import { Film, ImagePlus, Smile, StickyNote, Type, Heading } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import { BACKGROUNDS, DOODLE_STICKERS, EMOJI_STICKERS } from '../../lib/cover';
import type { CoverBackground } from '../../lib/types';
import { FlowerDoodle, HeartDoodle, SprigDoodle, StarDoodle } from '../Decor';

const DOODLES = { cuore: HeartDoodle, stella: StarDoodle, fiore: FlowerDoodle, rametto: SprigDoodle };

export type AddRequest = { type: 'title' } | { type: 'note' } | { type: 'text' } | { type: 'sticker'; sticker: string };

interface AddBarProps {
  background: CoverBackground;
  hasTitle: boolean;
  /** Copertina piena oppure caricamento in corso. */
  disabled: boolean;
  onFiles: (files: File[]) => void;
  onAdd: (request: AddRequest) => void;
  onBackground: (background: CoverBackground) => void;
}

/** Ciò che si può appoggiare sulla copertina, e lo sfondo su cui appoggiarlo. */
export function AddBar({ background, hasTitle, disabled, onFiles, onAdd, onBackground }: AddBarProps) {
  const [stickersOpen, setStickersOpen] = useState(false);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) onFiles(files);
  };
  const tool = `btn btn-soft min-h-11 px-4 py-1.5 ${disabled ? 'pointer-events-none opacity-50' : ''}`;

  return (
    <section className="card flex flex-col gap-5 rounded-2xl px-5 py-5 shadow-none" aria-label="Aggiungi alla copertina">
      <div>
        <span className="label">Aggiungi</span>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className={`${tool} cursor-pointer`}>
            <ImagePlus size={18} aria-hidden />
            Foto
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={pick} disabled={disabled} />
          </label>
          <label className={`${tool} cursor-pointer`}>
            <Film size={18} aria-hidden />
            Video
            <input type="file" className="sr-only" accept="video/mp4" onChange={pick} disabled={disabled} />
          </label>
          <button type="button" className={tool} onClick={() => onAdd({ type: 'note' })} disabled={disabled}>
            <StickyNote size={18} aria-hidden />
            Post-it
          </button>
          <button type="button" className={tool} onClick={() => onAdd({ type: 'text' })} disabled={disabled}>
            <Type size={18} aria-hidden />
            Messaggio
          </button>
          <button type="button" className={tool} onClick={() => setStickersOpen((open) => !open)} aria-expanded={stickersOpen} disabled={disabled}>
            <Smile size={18} aria-hidden />
            Sticker
          </button>
          {!hasTitle && (
            <button type="button" className={tool} onClick={() => onAdd({ type: 'title' })} disabled={disabled}>
              <Heading size={18} aria-hidden />
              Titolo
            </button>
          )}
        </div>
        <p className="mt-2 text-[0.92rem] italic text-ink-soft">
          Scegli più foto insieme per comporre un collage. Foto e video fino a 10 MB ciascuno.
        </p>
      </div>

      {stickersOpen && (
        <div className="grid grid-cols-7 gap-1 sm:grid-cols-10" role="group" aria-label="Sticker">
          {DOODLE_STICKERS.map((id) => {
            const Doodle = DOODLES[id];
            return (
              <button key={id} type="button" className="icon-btn text-accent-deep" onClick={() => onAdd({ type: 'sticker', sticker: id })} aria-label={`Sticker ${id}`} disabled={disabled}>
                <Doodle className="h-7 w-7" />
              </button>
            );
          })}
          {EMOJI_STICKERS.map((emoji) => (
            <button key={emoji} type="button" className="icon-btn text-2xl" onClick={() => onAdd({ type: 'sticker', sticker: emoji })} aria-label={`Sticker ${emoji}`} disabled={disabled}>
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div role="radiogroup" aria-label="Sfondo della copertina">
        <span className="label">Sfondo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {BACKGROUNDS.map(({ id, label }) => (
            <button key={id} type="button" role="radio" aria-checked={background === id} className="chip" onClick={() => onBackground(id)}>
              <span className={`cover-bg-${id} h-5 w-5 rounded-full ring-1 ring-black/15`} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
