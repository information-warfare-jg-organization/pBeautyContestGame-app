import { pool } from '../db/db.js';

export async function getGeneralAnswerDistribution() {
  const { rows } = await pool.query(`SELECT * FROM answer_distribution_general`);
  const row = rows[0] ?? {};

  const countsByAnswer = {};
  for (let i = 0; i <= 100; i++) {
    const key = String(i);
    countsByAnswer[key] = row.hasOwnProperty(key) ? Number(row[key] ?? 0) : 0;
  }

  return { countsByAnswer };
}
