// Piccole preferenze che restano su questo dispositivo.

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Navigazione privata o spazio esaurito: pazienza, si riparte dai valori predefiniti.
  }
}

/** Identifica questo dispositivo nei lock di modifica e nelle notifiche. */
export const clientId: string = (() => {
  const saved = read('libro.clientId');
  if (saved) return saved;
  const fresh = crypto.randomUUID();
  write('libro.clientId', fresh);
  return fresh;
})();

export const savedAuthor = {
  get: (bookId: string) => read(`libro.autore.${bookId}`),
  set: (bookId: string, author: string) => write(`libro.autore.${bookId}`, author),
};

export const savedNight = {
  get: (): boolean => {
    const saved = read('libro.notte');
    if (saved !== null) return saved === '1';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  set: (night: boolean) => write('libro.notte', night ? '1' : '0'),
};

export interface Draft {
  date: string;
  title: string;
  tag: string;
  contentHtml: string;
}

/** Bozza della pagina nuova: se chiudi per sbaglio, la ritrovi. */
export const savedDraft = {
  get: (bookId: string): Draft | null => {
    try {
      return JSON.parse(read(`libro.bozza.${bookId}`) ?? 'null');
    } catch {
      return null;
    }
  },
  set: (bookId: string, draft: Draft | null) =>
    write(`libro.bozza.${bookId}`, draft ? JSON.stringify(draft) : null),
};
