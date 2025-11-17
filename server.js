import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { listGames, getGame, createGame, updateGameStatus, deleteGame } from './src/services/gameService.js';
import { getAnswersByIds, createAnswer, countAnswersByGame, listAnswersByGame } from './src/services/answerService.js';
import { getWinningStats } from './src/services/winningStatsService.js';
import { getAnswerDistribution } from './src/services/answerDistributionService.js';
import { getGeneralWinningStats } from './src/services/generalWinningStatsService.js';
import { getGeneralAnswerDistribution } from './src/services/generalAnswerDistributionService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/style', express.static(path.join(__dirname, 'src', 'view', 'style')));
app.use('/scripts', express.static(path.join(__dirname, 'src', 'view', 'scripts')));

// ustawienia widoków
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './src/view')); // <-- katalog z widokami

// (opcjonalnie) statyczne pliki, jeśli dodasz CSS/JS
app.use('/static', express.static(path.join(__dirname, './src/public')));

// ====== WIDOK /gamse ======
app.get('/games', async (req, res) => {
  try {
    const games = await listGames(); // pobieramy z serwisu
    res.render('gamesView', { games });  // render widoku ./src/view/games.ejs
  } catch (err) {
    console.error('Błąd renderowania /gamesView:', err);
    res.status(500).send('Błąd serwera');
  }
});


// ====== WIDOK /game/gameId ======
app.get('/games/:gameId', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    const game = await getGame(gameId);

    if (!game) return res.status(404).send('Game not found');

    // widok dla gry otwartej
    if (game.game_status === 'open') {
      const answersCount = await countAnswersByGame(gameId);
      return res.render('openGameDetailsView', {
        gameId,
        answersCount
      });
    }

    // statystyki gry zamkniętej
    const stats = await getWinningStats(gameId);
    const dist = await getAnswerDistribution(gameId);
    const winners = await getAnswersByIds(stats.closest_answer_ids);

    const distribution = Object.entries(dist.countsByAnswer)
      .map(([value, count]) => ({ value: Number(value), count: Number(count) }))
      .filter(x => x.count > 0)
      .sort((a, b) => a.value - b.value);

    const allAnswers = await listAnswersByGame(gameId);

    res.render('gameDetailsView', {
      gameId,
      mean: stats.mean,
      winningValue: stats.winning_value,
      playersCount: stats.total_answers,
      winners,
      distribution,
      allAnswers   
    });

  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || 'Server error');
  }
});



// (opcjonalnie) przekierowanie z / na /gamse
app.get('/', (req, res) => res.redirect('/games'));

// GET: formularz odpowiedzi
app.get('/games/:gameId/answer', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    const game = await getGame(gameId);
    if (!game) return res.status(404).send('Game not found');

    if (game.game_status !== 'open') {
      return res.redirect(`/games/${gameId}`);
    }

    res.render('answerFormView', {
      gameId,
      error: req.query.error ?? null,
      values: { userName: '', answer: '' }
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
});

// POST: zapis odpowiedzi
app.post('/games/:gameId/answer', async (req, res) => {
  const gameId = Number(req.params.gameId);
  const { userName, answer } = req.body;

  try {
    const game = await getGame(gameId);
    if (!game) return res.status(404).send('Game not found');

    if (game.game_status !== 'open') {
      return res.redirect(`/games/${gameId}`);
    }

    const parsedAnswer = Number.parseInt(answer, 10);
    if (!userName || !Number.isInteger(parsedAnswer) || parsedAnswer < 0 || parsedAnswer > 100) {
      const msg = encodeURIComponent('Podaj nazwę oraz odpowiedź 0–100.');
      return res.redirect(`/games/${gameId}/answer?error=${msg}`);
    }

    await createAnswer(gameId, { userName, answer: parsedAnswer });
    return res.redirect(`/games/${gameId}`);
  } catch (e) {
    console.error(e);
    const msg = encodeURIComponent(e.message || 'Błąd zapisu odpowiedzi');
    return res.redirect(`/games/${gameId}/answer?error=${msg}`);
  }
});

// GET: panel admina z listą gier
app.get('/admin/games', async (req, res) => {
  try {
    const games = await listGames({ limit: 500, offset: 0 });
    res.render('adminGamesView', {
      games,
      flash: req.query.flash ?? null,
      error: req.query.error ?? null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
});

// POST: utwórz nową grę (domyślnie open)
app.post('/admin/games', async (req, res) => {
  try {
    const status = (req.body.gameStatus === 'closed') ? 'closed' : 'open';
    await createGame({ gameStatus: status });
    res.redirect('/admin/games?flash=Utworzono+nową+grę');
  } catch (e) {
    console.error(e);
    res.redirect('/admin/games?error=' + encodeURIComponent(e.message || 'Błąd tworzenia gry'));
  }
});

// POST: zamknij grę
app.post('/admin/games/:id/close', async (req, res) => {
  try {
    await updateGameStatus(Number(req.params.id), 'closed');
    res.redirect('/admin/games?flash=Zamknięto+grę');
  } catch (e) {
    console.error(e);
    res.redirect('/admin/games?error=' + encodeURIComponent(e.message || 'Błąd zamykania gry'));
  }
});

// POST: otwórz grę
app.post('/admin/games/:id/open', async (req, res) => {
  try {
    await updateGameStatus(Number(req.params.id), 'open');
    res.redirect('/admin/games?flash=Otwarto+grę');
  } catch (e) {
    console.error(e);
    res.redirect('/admin/games?error=' + encodeURIComponent(e.message || 'Błąd otwierania gry'));
  }
});

// POST: usuń grę (kaskadowo usunie answers jeśli masz ON DELETE CASCADE)
app.post('/admin/games/:id/delete', async (req, res) => {
  try {
    await deleteGame(Number(req.params.id));
    res.redirect('/admin/games?flash=Usunięto+grę');
  } catch (e) {
    console.error(e);
    res.redirect('/admin/games?error=' + encodeURIComponent(e.message || 'Błąd usuwania gry'));
  }
});

// ROUTE: /games/general
app.get('/general/games', async (req, res) => {
  try {
    const stats = await getGeneralWinningStats();        
    const dist = await getGeneralAnswerDistribution();    

    const distribution = Object.entries(dist.countsByAnswer)
      .map(([value, count]) => ({ value: Number(value), count: Number(count) }))
      .filter(x => x.count > 0)
      .sort((a, b) => a.value - b.value);

    res.render('generalDetailsView', {
      mean: stats.mean,
      winningValue: stats.winning_value,
      playersCount: stats.total_answers,
      // w ujęciu "general" nie zwracamy listy zwycięzców (brak najbliższych id)
      distribution
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message || 'Błąd serwera');
  }
});


// ====== API endpoint: POST /api/games/:gameId/answer ======
app.post('/api/games/:gameId/answer', async (req, res) => {
  const gameId = Number(req.params.gameId);
  const { userName, answer } = req.body;

  try {
    const game = await getGame(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.game_status !== 'open') {
      return res.status(409).json({ error: 'Game is not open' });
    }

    const parsedAnswer = Number.parseInt(answer, 10);

    if (!userName || !Number.isInteger(parsedAnswer) || parsedAnswer < 0 || parsedAnswer > 100) {
      return res
        .status(400)
        .json({ error: 'Invalid payload. Provide userName and answer 0–100.' });
    }

    const created = await createAnswer(gameId, {
      userName,
      answer: parsedAnswer
    });

    return res.status(201).json({
      ok: true,
      gameId,
      answer: {
        userName,
        value: parsedAnswer,
        id: created?.id ?? null
      }
    });
  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// ====== API endpoint: POST /api/games/:gameId/answer/series ======
app.post('/api/games/:gameId/answer/series', async (req, res) => {
  const gameId = Number(req.params.gameId);

  try {
    // 1) Sprawdź czy gra istnieje i jest otwarta
    const game = await getGame(gameId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.game_status !== 'open') {
      return res.status(409).json({ error: 'Game is not open' });
    }

    // 2) Weź listę odpowiedzi z body
    //    Możemy obsłużyć zarówno { answers: [...] } jak i samą tablicę [...]
    let answersPayload = req.body;
    if (!Array.isArray(answersPayload) && Array.isArray(req.body.answers)) {
      answersPayload = req.body.answers;
    }

    if (!Array.isArray(answersPayload) || answersPayload.length === 0) {
      return res.status(400).json({
        error: 'Provide a non-empty array of answers in body (either { "answers": [...] } or just [...]).'
      });
    }

    // 3) Walidacja danych wejściowych
    const sanitized = answersPayload.map((item, index) => {
      const userName = item?.userName;
      const rawAnswer = item?.answer;

      const parsedAnswer = Number.parseInt(rawAnswer, 10);

      if (typeof userName !== 'string' || userName.trim() === '') {
        throw {
          status: 400,
          message: `answers[${index}].userName must be non-empty string`
        };
      }

      if (!Number.isInteger(parsedAnswer) || parsedAnswer < 0 || parsedAnswer > 100) {
        throw {
          status: 400,
          message: `answers[${index}].answer must be integer 0–100`
        };
      }

      return {
        userName: userName.trim(),
        answer: parsedAnswer
      };
    });

    // 4) Zapis do bazy – używamy istniejącej funkcji createAnswer
    const createdAnswers = [];

    for (const a of sanitized) {
      // createAnswer ma już dodatkowe walidacje (gra otwarta, itp.)
      const created = await createAnswer(gameId, a);
      createdAnswers.push(created);
    }

    return res.status(201).json({
      ok: true,
      gameId,
      count: createdAnswers.length,
      answers: createdAnswers
    });

  } catch (e) {
    console.error('API series error:', e);

    // obsługa błędów “rzuconych ręcznie” (status, message)
    if (e && typeof e === 'object' && 'status' in e) {
      return res.status(e.status).json({ error: e.message || 'Validation error' });
    }

    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});



/* ===== START ===== */
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Web + API listening on http://localhost:${port}`);
});
