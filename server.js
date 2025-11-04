import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  listGames
} from './src/services/gameService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use('/style', express.static(path.join(__dirname, 'src', 'view', 'style')));

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

// (opcjonalnie) przekierowanie z / na /gamse
app.get('/', (req, res) => res.redirect('/games'));

/* ====== API (jak wcześniej) – zostawiam skrótowo, masz je już zrobione ====== */

// ... tu Twoje endpointy API /games, /answers, /admins, /auth/login z wcześniejszej wersji ...

/* ===== START ===== */
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Web + API listening on http://localhost:${port}`);
});
