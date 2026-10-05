// Avvia tutto ciò che serve in sviluppo: PostgreSQL locale (senza Docker), API e frontend.
//   npm run dev             database integrato + server + client
//   npm run dev -- --no-db  solo server + client (database già avviato, es. "docker compose up db")
//   npm run preview         frontend compilato servito da Express su una sola porta, come in produzione
import { execSync, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  // Nessun .env: valgono i valori predefiniti.
}

// I processi figli devono trovare lo stesso Node con cui è partito questo script.
const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
const env = { ...process.env, [pathKey]: `${path.dirname(process.execPath)}${path.delimiter}${process.env[pathKey] ?? ''}` };

const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    try {
      // Su Windows "npm run" è una shell: va chiuso tutto il suo albero di processi.
      if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      else child.kill('SIGTERM');
    } catch {
      // Già terminato.
    }
  }
  process.exit(code);
}

function run(name, dir, script, extraEnv = {}) {
  const child = spawn(`npm run ${script}`, { cwd: path.join(root, dir), env: { ...env, ...extraEnv }, stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`[${name}] si è fermato (codice ${code}).`);
      stop(code ?? 1);
    }
  });
  children.push(child);
}

function waitForPort(port, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error(`La porta ${port} non risponde.`));
        else setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

if (!process.argv.includes('--no-db')) {
  run('db', 'server', 'db:local');
  await waitForPort(Number(process.env.LOCAL_DB_PORT ?? 5432));
}
if (process.argv.includes('--built')) {
  // Anteprima "come in produzione": una sola porta, Express serve anche il frontend compilato (client/dist).
  run('server', 'server', 'dev');
} else {
  // La variabile PORT ereditata (es. da uno strumento di anteprima) riguarda il client: le API restano sulla loro porta.
  run('server', 'server', 'dev', { PORT: process.env.API_PORT ?? '3000' });
  run('client', 'client', 'dev');
}
