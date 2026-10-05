// Avvia un PostgreSQL locale senza Docker (binari scaricati da npm con "embedded-postgres").
// Uso: npm run db:local  — resta in ascolto finché non premi Ctrl+C.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = process.env.LOCAL_DB_DIR ?? path.join(os.homedir(), '.il-nostro-libro', 'pgdata');
const port = Number(process.env.LOCAL_DB_PORT ?? 5432);

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user: 'libro',
  password: 'libro',
  persistent: true,
  onLog: () => {},
  onError: (err) => console.error(err),
});

const firstRun = !fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
if (firstRun) await pg.initialise();
await pg.start();
if (firstRun) await pg.createDatabase('libro');

console.log(`PostgreSQL locale pronto: postgres://libro:libro@localhost:${port}/libro`);
console.log(`Dati in ${databaseDir} — Ctrl+C per fermarlo.`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
