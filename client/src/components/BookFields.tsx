import { THEMES } from '../lib/tags';
import type { Theme } from '../lib/types';

export interface BookForm {
  partnerOne: string;
  partnerTwo: string;
  coupleName: string;
  startDate: string;
  theme: Theme;
}

interface BookFieldsProps {
  value: BookForm;
  onChange: (change: Partial<BookForm>) => void;
}

/** I dati del libro: usati sia alla creazione sia nelle impostazioni. */
export function BookFields({ value, onChange }: BookFieldsProps) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="label">Il primo nome</span>
          <input
            className="field mt-1 font-hand text-2xl"
            value={value.partnerOne}
            maxLength={40}
            onChange={(e) => onChange({ partnerOne: e.target.value })}
            placeholder="Anna"
            autoComplete="off"
            required
          />
        </label>
        <label>
          <span className="label">Il secondo nome</span>
          <input
            className="field mt-1 font-hand text-2xl"
            value={value.partnerTwo}
            maxLength={40}
            onChange={(e) => onChange({ partnerTwo: e.target.value })}
            placeholder="Marco"
            autoComplete="off"
            required
          />
        </label>
      </div>
      <label>
        <span className="label">Il titolo del vostro libro</span>
        <input
          className="field mt-1 text-2xl font-semibold italic"
          value={value.coupleName}
          maxLength={60}
          onChange={(e) => onChange({ coupleName: e.target.value })}
          placeholder="Anna & Marco"
          autoComplete="off"
          required
        />
      </label>
      <label>
        <span className="label">Da quando siete voi due</span>
        <input
          type="date"
          className="field mt-1"
          value={value.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
          required
        />
      </label>
      <div role="radiogroup" aria-labelledby="colore-libro">
        <span className="label" id="colore-libro">
          Il colore del libro
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {THEMES.map(({ id, label, swatch }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={value.theme === id}
              className="chip"
              onClick={() => onChange({ theme: id })}
            >
              <span className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: swatch }} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
