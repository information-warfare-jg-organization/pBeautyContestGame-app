import { pool } from '../db/db.js';

export async function getAnswerDistribution(gameId) {
  const { rows } = await pool.query(
    `SELECT * FROM answer_distribution_by_game WHERE game_id = $1`,
    [gameId]
  );

  if (!rows.length) {
    const err = new Error('Distribution not found for given gameId');
    err.status = 404;
    throw err;
  }

  const row = rows[0];

  const countsByAnswer = {};
  for (let i = 0; i <= 100; i++) {
    const key = String(i);
    countsByAnswer[key] = row.hasOwnProperty(key) ? Number(row[key] ?? 0) : 0;
  }

  return {
    game_id: Number(row.game_id),
    countsByAnswer,
  };
}
