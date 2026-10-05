import { migrate } from './migrate.js';
import { pool } from './pool.js';

const applied = await migrate();
console.log(applied.length ? `Migrazioni applicate: ${applied.join(', ')}` : 'Database già aggiornato.');
await pool.end();
