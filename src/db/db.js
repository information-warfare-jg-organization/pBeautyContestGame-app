import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: {
        rejectUnauthorized: process.env.SSLREQUIRE,
        ca: process.env.SSLCERT,
    },
});

pool.on('error', (err) => {
  console.error('Błąd puli PG:', err);
});
