import { pool } from '../db/db.js';

export async function getGeneralWinningStats() {
  const { rows } = await pool.query(
    `SELECT mean, winning_value, total_answers FROM general_winning_stats`
  );

  // widok zwraca pojedynczy wiersz; jeśli nie ma danych, mogą być NULL-e
  const r = rows[0] ?? { mean: null, winning_value: null, total_answers: 0 };

  return {
    mean: r.mean !== null ? Number(r.mean) : null,
    winning_value: r.winning_value !== null ? Number(r.winning_value) : null,
    total_answers: r.total_answers !== null ? Number(r.total_answers) : 0,
  };
}
