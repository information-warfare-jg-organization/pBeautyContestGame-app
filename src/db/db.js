import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

export const pool = process.env.SSLREQUIRE ?? false ?

new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: {
        rejectUnauthorized: process.env.SSLREQUIRE ?? false,
        ca: process.env.SSLCERT ?? "",
    },
}) :
new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
}) 


pool.on('error', (err) => {
  console.error('Błąd puli PG:', err);
});
