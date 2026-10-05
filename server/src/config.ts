import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');

const isProd = process.env.NODE_ENV === 'production';

function requireInProd(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return devFallback;
}

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireInProd('DATABASE_URL', 'postgres://libro:libro@localhost:5432/libro'),
  // Firma le sessioni e deriva l'impronta dei codici d'accesso: cambiarlo invalida tutti i codici.
  appSecret: requireInProd('APP_SECRET', 'solo-per-sviluppo-non-usare-in-produzione'),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(serverRoot, 'uploads')),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024,
  clientDist: path.resolve(process.env.CLIENT_DIST ?? path.join(serverRoot, '..', 'client', 'dist')),
  migrationsDir: path.join(serverRoot, 'migrations'),
  sessionCookie: 'libro_session',
  sessionDays: 90,
};
