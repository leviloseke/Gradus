import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);

export async function migrate() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(schema);
  await pool.query(seed);
}
