import { pool } from './../db/db.js';

export async function listGames({ status, limit = 50, offset = 0 } = {}) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE game_status = $${params.length}`;
  }
  params.push(Number(limit), Number(offset));

  const q = `
    SELECT game_id, game_date, game_status
    FROM game
    ${where}
    ORDER BY game_id DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const { rows } = await pool.query(q, params);
  return rows;
}

export async function getGame(id) {
  const { rows } = await pool.query(
    `SELECT game_id, game_date, game_status FROM game WHERE game_id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createGame({ gameStatus = 'open' } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO game (game_status)
     VALUES ($1)
     RETURNING game_id, game_date, game_status`,
    [gameStatus]
  );
  return rows[0];
}

export async function updateGameStatus(id, gameStatus) {
  const { rows } = await pool.query(
    `UPDATE game
     SET game_status = $1
     WHERE game_id = $2
     RETURNING game_id, game_date, game_status`,
    [gameStatus, id]
  );
  return rows[0] ?? null;
}

export async function deleteGame(id) {
  const { rowCount } = await pool.query(
    `DELETE FROM game WHERE game_id = $1`,
    [id]
  );
  return rowCount > 0;
}
