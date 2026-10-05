import { clientId } from './device';
import type { Media } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const OFFLINE = 'Non riusciamo a raggiungere il libro. Controlla la connessione e riprova.';

/** Chiamata JSON alle API; la sessione viaggia nel cookie. */
export async function api<T = void>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        'x-client-id': clientId,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, OFFLINE);
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Qualcosa è andato storto. Riprova tra un momento.', data);
  }
  return data as T;
}

/** Carica un file mostrando la percentuale (fetch non lo permette ancora). */
export function uploadMedia(file: File, onProgress: (fraction: number) => void): Promise<Media> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.setRequestHeader('x-client-id', clientId);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 201) resolve(xhr.response.media);
      else reject(new ApiError(xhr.status, xhr.response?.error ?? 'Non siamo riusciti a caricare questo file.'));
    };
    xhr.onerror = () => reject(new ApiError(0, OFFLINE));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Qualcosa è andato storto. Riprova tra un momento.';
