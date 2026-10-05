import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { config } from '../config.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...err.extra });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Dati non validi.' });
    return;
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    const mb = Math.round(config.maxUploadBytes / 1024 / 1024);
    res.status(tooBig ? 413 : 400).json({
      error: tooBig
        ? `Questo file è troppo grande: il libro accoglie ricordi fino a ${mb} MB ciascuno.`
        : 'Non siamo riusciti a ricevere il file. Riprova.',
    });
    return;
  }
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: 'Richiesta non valida.' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Qualcosa è andato storto. Riprova tra un momento.' });
};
