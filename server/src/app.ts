import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { errorHandler, HttpError } from './lib/errors.js';
import { booksRouter } from './routes/books.js';
import { entriesRouter } from './routes/entries.js';
import { exportRouter } from './routes/export.js';
import { mediaRouter } from './routes/media.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // In produzione siamo dietro il proxy di Fly: serve per IP reali e rate limit.
  app.set('trust proxy', config.isProd ? 1 : false);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://*.giphy.com', 'https://*.tenor.com', 'https://i.ytimg.com'],
          mediaSrc: ["'self'", 'blob:'],
          frameSrc: ['https://www.youtube-nocookie.com', 'https://open.spotify.com'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  });

  app.use('/api', booksRouter, entriesRouter, mediaRouter, exportRouter);
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Indirizzo non trovato.')));

  // In produzione Express serve anche il frontend già compilato.
  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use(errorHandler);
  return app;
}
