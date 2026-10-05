import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { RequestHandler, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from './errors.js';

declare global {
  namespace Express {
    interface Request {
      /** Libro a cui la sessione dà accesso (impostato da requireBook). */
      bookId: string;
      /** Identificativo del dispositivo, usato per i lock di modifica. */
      clientId: string | null;
    }
  }
}

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const codeSalt = crypto.createHash('sha256').update(`codice:${config.appSecret}`).digest();

export function normalizeCode(code: string): string {
  return code.normalize('NFKC').trim().toLowerCase();
}

/**
 * Impronta deterministica del codice di accesso: il codice è la sola credenziale,
 * quindi serve poterlo cercare; scrypt lo rende costoso da indovinare a tentativi.
 */
export async function codeLookup(code: string): Promise<string> {
  return (await scrypt(normalizeCode(code), codeSalt, 32)).toString('hex');
}

export function signSession(bookId: string): string {
  return jwt.sign({ sub: bookId }, config.appSecret, { expiresIn: `${config.sessionDays}d` });
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.appSecret);
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function bookIdFromCookieHeader(header: string | undefined): string | null {
  if (!header) return null;
  return verifySession(parseCookie(header)[config.sessionCookie]);
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.isProd,
  path: '/',
};

export function setSessionCookie(res: Response, bookId: string): void {
  res.cookie(config.sessionCookie, signSession(bookId), {
    ...cookieOptions,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.sessionCookie, cookieOptions);
}

export const requireBook: RequestHandler = (req, _res, next) => {
  const bookId = bookIdFromCookieHeader(req.headers.cookie);
  if (!bookId) {
    next(new HttpError(401, 'Per aprire il libro serve la vostra chiave.'));
    return;
  }
  req.bookId = bookId;
  const clientId = req.get('x-client-id');
  req.clientId = clientId && clientId.length <= 64 ? clientId : null;
  next();
};
