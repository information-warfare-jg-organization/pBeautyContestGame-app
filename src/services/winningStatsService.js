import { pool } from '../db/db.js';

export async function getWinningStats(gameId) {
  const { rows } = await pool.query(
    `SELECT game_id, mean, winning_value, closest_answer_ids
     FROM game_winning_stats
     WHERE game_id = $1`,
    [gameId]
  );

  if (!rows.length) {
    const err = new Error('Winning stats not found for given gameId');
    err.status = 404;
    throw err;
  }

  const r = rows[0];
  return {
    game_id: Number(r.game_id),
    mean: r.mean !== null ? Number(r.mean) : null,
    winning_value: r.winning_value !== null ? Number(r.winning_value) : null,
    closest_answer_ids: Array.isArray(r.closest_answer_ids) ? r.closest_answer_ids.map(Number) : [],
  };
}
