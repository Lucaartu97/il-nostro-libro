import { ArrowDownToLine, ArrowUpToLine, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { NOTE_COLORS, TEXT_COLORS } from '../../lib/cover';
import type { CoverItem } from '../../lib/types';

const SWATCHES: Record<string, string> = {
  giallo: '#f9e37c',
  rosa: '#f8b9cb',
  azzurro: '#b5d8f1',
  verde: '#bfe3a9',
  inchiostro: '#4b2e35',
  chiaro: '#fff8ee',
  accento: 'var(--accent)',
  oro: '#c9a25e',
};

const TITLES: Record<CoverItem['type'], string> = {
  title: 'Il titolo',
  photo: 'La foto',
  video: 'Il video',
  note: 'Il post-it',
  text: 'Il messaggio',
  sticker: 'Lo sticker',
};

interface ItemPanelProps {
  item: CoverItem;
  onChange: (change: Record<string, unknown>) => void;
  onRemove: () => void;
  onFront: () => void;
  onBack: () => void;
}

function Choices<T extends string>(props: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onPick: (id: T) => void;
  swatches?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={props.label}>
      <span className="label">{props.label}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {props.options.map(({ id, label }) => (
          <button key={id} type="button" role="radio" aria-checked={props.value === id} className="chip" onClick={() => props.onPick(id)}>
            {props.swatches && (
              <span className="h-4 w-4 rounded-full ring-1 ring-black/15" style={{ background: SWATCHES[id] }} aria-hidden />
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="label flex justify-between">
        {props.label}
        <span className="tabular-nums tracking-normal">
          {Math.round(props.value)}
          {props.unit}
        </span>
      </span>
      <input
        type="range"
        className="mt-2 w-full accent-[var(--accent)]"
        min={props.min}
        max={props.max}
        step={1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Tutto ciò che si può cambiare dell'elemento selezionato sulla copertina. */
export function ItemPanel({ item, onChange, onRemove, onFront, onBack }: ItemPanelProps) {
  let specific: ReactNode = null;
  if (item.type === 'note' || item.type === 'text') {
    specific = (
      <>
        <label className="block">
          <span className="label">Cosa c’è scritto</span>
          <textarea
            className="field mt-1 resize-none font-hand text-2xl leading-snug"
            rows={3}
            maxLength={240}
            value={item.text}
            onChange={(e) => onChange({ text: e.target.value })}
            onFocus={(e) => e.target.select()}
          />
        </label>
        {item.type === 'note' ? (
          <Choices label="Colore" value={item.color} options={NOTE_COLORS} onPick={(color) => onChange({ color })} swatches />
        ) : (
          <>
            <Choices
              label="Scrittura"
              value={item.font}
              options={[
                { id: 'mano', label: 'A mano' },
                { id: 'stampa', label: 'Elegante' },
              ]}
              onPick={(font) => onChange({ font })}
            />
            <Choices label="Colore" value={item.color} options={TEXT_COLORS} onPick={(color) => onChange({ color })} swatches />
          </>
        )}
      </>
    );
  } else if (item.type === 'photo') {
    specific = (
      <Choices
        label="Cornice"
        value={item.frame}
        options={[
          { id: 'polaroid', label: 'Polaroid' },
          { id: 'nessuna', label: 'Senza cornice' },
        ]}
        onPick={(frame) => onChange({ frame })}
      />
    );
  }

  return (
    <section className="card flex flex-col gap-5 rounded-2xl px-5 py-5 shadow-none" aria-label={TITLES[item.type]}>
      <h2 className="text-2xl font-semibold italic text-accent-deep">{TITLES[item.type]}</h2>
      {specific}
      <Slider label="Grandezza" value={item.w} min={6} max={100} unit="%" onChange={(w) => onChange({ w })} />
      <Slider label="Inclinazione" value={item.rot} min={-90} max={90} unit="°" onChange={(rot) => onChange({ rot })} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-soft min-h-10 px-4 py-1" onClick={onFront}>
          <ArrowUpToLine size={17} aria-hidden />
          Porta sopra
        </button>
        <button type="button" className="btn btn-soft min-h-10 px-4 py-1" onClick={onBack}>
          <ArrowDownToLine size={17} aria-hidden />
          Manda sotto
        </button>
        <button type="button" className="btn btn-ghost min-h-10 border border-line px-4 py-1" onClick={onRemove}>
          <Trash2 size={17} aria-hidden />
          Togli
        </button>
      </div>
    </section>
  );
}
