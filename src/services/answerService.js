// CRUD dla tabeli answer
import { pool } from '../db/db.js';

export async function listAnswers({ gameId, limit = 50, offset = 0 } = {}) {
  const params = [];
  let where = '';
  if (gameId) {
    params.push(Number(gameId));
    where = `WHERE a.game_id = $${params.length}`;
  }
  params.push(Number(limit), Number(offset));

  const q = `
    SELECT a.answer_id, a.user_name, a.answer, a.game_id, a.answer_date
    FROM answer a
    ${where}
    ORDER BY a.answer_date DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;
  const { rows } = await pool.query(q, params);
  return rows;
}


export async function getAnswersByIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const { rows } = await pool.query(
    `SELECT answer_id, user_name, answer, game_id, answer_date
     FROM answer
     WHERE answer_id = ANY($1::int[])
     ORDER BY answer_id`,
    [ids]
  );

  return rows;
}


export async function getAnswer(id) {
  const { rows } = await pool.query(
    `SELECT answer_id, user_name, answer, game_id, answer_date
     FROM answer WHERE answer_id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createAnswer(gameId, { userName, answer }) {
  if (!Number.isInteger(answer) || answer < 0 || answer > 100) {
    const err = new Error('answer must be integer 0-100');
    err.status = 400;
    throw err;
  }
  if (typeof userName !== 'string' || userName.trim() === '') {
    const err = new Error('userName is required');
    err.status = 400;
    throw err;
  }

  // weryfikacja gry i statusu
  const g = await pool.query(
    `SELECT game_id, game_status FROM game WHERE game_id = $1`,
    [gameId]
  );
  if (!g.rowCount) {
    const err = new Error('Game not found');
    err.status = 404;
    throw err;
  }
  if (g.rows[0].game_status !== 'open') {
    const err = new Error('Game is closed');
    err.status = 409;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO answer (user_name, answer, game_id)
     VALUES ($1, $2, $3)
     RETURNING answer_id, user_name, answer, game_id, answer_date`,
    [userName, answer, gameId]
  );
  return rows[0];
}

export async function countAnswersByGame(gameId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM answer WHERE game_id = $1`,
    [gameId]
  );
  return rows[0]?.cnt ?? 0;
}

export async function updateAnswer(id, { userName, answer }) {
  const sets = [];
  const params = [];
  if (userName !== undefined) {
    if (typeof userName !== 'string' || userName.trim() === '') {
      const err = new Error('userName cannot be empty');
      err.status = 400;
      throw err;
    }
    params.push(userName);
    sets.push(`user_name = $${params.length}`);
  }
  if (answer !== undefined) {
    if (!Number.isInteger(answer) || answer < 0 || answer > 100) {
      const err = new Error('answer must be integer 0-100');
      err.status = 400;
      throw err;
    }
    params.push(answer);
    sets.push(`answer = $${params.length}`);
  }
  if (!sets.length) {
    const err = new Error('No fields to update');
    err.status = 400;
    throw err;
  }
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE answer SET ${sets.join(', ')}
     WHERE answer_id = $${params.length}
     RETURNING answer_id, user_name, answer, game_id, answer_date`,
    params
  );
  return rows[0] ?? null;
}

export async function deleteAnswer(id) {
  const { rowCount } = await pool.query(
    `DELETE FROM answer WHERE answer_id = $1`,
    [id]
  );
  return rowCount > 0;
}
