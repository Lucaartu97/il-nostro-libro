import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * I test girano su un PostgreSQL vero: quello indicato da TEST_DATABASE_URL (CI)
 * oppure uno temporaneo avviato al volo con embedded-postgres.
 */
export default async function setup() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'libro-test-'));
  process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
  process.env.APP_SECRET = 'segreto-solo-per-i-test';

  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    return async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    };
  }

  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const port = await freePort();
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(tmp, 'pgdata'),
    port,
    user: 'libro',
    password: 'libro',
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('libro_test');
  process.env.DATABASE_URL = `postgres://libro:libro@127.0.0.1:${port}/libro_test`;

  return async () => {
    await pg.stop();
    await fs.rm(tmp, { recursive: true, force: true });
  };
}
