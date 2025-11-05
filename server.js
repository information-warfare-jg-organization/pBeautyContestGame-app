import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { listGames, getGame } from './src/services/gameService.js';
import { getWinningStats } from './src/services/winningStatsService.js';
import { getAnswerDistribution } from './src/services/anwserDistributionService.js';
import { listAnswers, getAnswersByIds,createAnswer } from './src/services/anwserService.js';


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
    if (!Number.isInteger(gameId)) return res.status(400).send('Nieprawidłowe gameId');

    const stats = await getWinningStats(gameId);          // mean, winning_value, closest_answer_ids
    const dist  = await getAnswerDistribution(gameId);    // countsByAnswer { "0": n, ... "100": n }

    // Pobierz zwycięskie odpowiedzi (użytkownicy + wartości)
    const winners = await getAnswersByIds(stats.closest_answer_ids);

    // Przygotuj dane do histogramu: tylko słupki z count > 0, rosnąco
    const distribution = Object.entries(dist.countsByAnswer)
      .map(([value, count]) => ({ value: Number(value), count: Number(count) }))
      .filter(x => x.count > 0)
      .sort((a, b) => a.value - b.value);

  res.render('gameDetailsView', {
    gameId,
    mean: stats.mean,
    winningValue: stats.winning_value,
    playersCount: stats.total_answers, 
    winners,
    distribution
  });
  } catch (e) {
    console.error(e);
    res.status(e.status ?? 500).send(e.message ?? 'Błąd serwera');
  }
});

// (opcjonalnie) przekierowanie z / na /gamse
app.get('/', (req, res) => res.redirect('/games'));

// GET: formularz odpowiedzi
app.get('/games/:gameId/anwser', async (req, res) => {
  try {
    const gameId = Number(req.params.gameId);
    const game = await getGame(gameId);
    if (!game) return res.status(404).send('Game not found');

    if (game.game_status !== 'open') {
      return res.redirect(`/games/${gameId}`);
    }

    res.render('anwserFormView', {
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
app.post('/games/:gameId/anwser', async (req, res) => {
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
      return res.redirect(`/games/${gameId}/anwser?error=${msg}`);
    }

    await createAnswer(gameId, { userName, answer: parsedAnswer });
    return res.redirect(`/games/${gameId}`);
  } catch (e) {
    console.error(e);
    const msg = encodeURIComponent(e.message || 'Błąd zapisu odpowiedzi');
    return res.redirect(`/games/${gameId}/anwser?error=${msg}`);
  }
});


/* ====== API (jak wcześniej) – zostawiam skrótowo, masz je już zrobione ====== */

// ... tu Twoje endpointy API /games, /answers, /admins, /auth/login z wcześniejszej wersji ...

/* ===== START ===== */
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Web + API listening on http://localhost:${port}`);
});
