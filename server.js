import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { listGames } from './src/services/gameService.js';
import { getWinningStats } from './src/services/winningStatsService.js';
import { getAnswerDistribution } from './src/services/anwserDistributionService.js';
import { listAnswers, getAnswersByIds } from './src/services/anwserService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
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

/* ====== API (jak wcześniej) – zostawiam skrótowo, masz je już zrobione ====== */

// ... tu Twoje endpointy API /games, /answers, /admins, /auth/login z wcześniejszej wersji ...

/* ===== START ===== */
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Web + API listening on http://localhost:${port}`);
});
