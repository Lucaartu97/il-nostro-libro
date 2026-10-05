import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { pool } from './db/pool.js';
import { initRealtime } from './realtime/hub.js';
import { cleanOrphanMedia } from './routes/media.js';

/** Il database può metterci qualche secondo ad accettare connessioni (avvio a freddo, deploy). */
async function migrateWhenReady(attempts = 15): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      const applied = await migrate();
      if (applied.length) console.log(`Migrazioni applicate: ${applied.join(', ')}`);
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.warn(`Database non ancora pronto (tentativo ${attempt}/${attempts}), riprovo…`);
      await sleep(2000);
    }
  }
}

await migrateWhenReady();

const server = http.createServer(createApp());
const io = initRealtime(server);

const cleanup = setInterval(
  () => cleanOrphanMedia().catch((err) => console.error('Pulizia media fallita', err)),
  6 * 60 * 60 * 1000,
);
cleanup.unref();

server.listen(config.port, () => {
  console.log(`Il Nostro Libro è aperto su http://localhost:${config.port}`);
});

async function shutdown(): Promise<void> {
  clearInterval(cleanup);
  await io.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
