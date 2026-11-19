const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const User = require('./models/user');
const Luke = require('./models/luke');
const Svar = require('./models/svar');

const app = express();
const PORT = process.env.PORT || 4000;
const ER_PROD = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Personvern
app.locals.visNavn = email => (email ? email.split('@')[0] : 'Ukjent');

// Hjelpefunksjoner

function dagIDesember(req) {
  if (!ER_PROD && req.cookies.testdag) {
    return Number(req.cookies.testdag);
  }
  const [, mnd, dag] = new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })
    .split('-')
    .map(Number);
  return mnd === 12 ? dag : 0;
}

// Gir et heltall 1–24, ellers null
function lesDag(verdi) {
  const dag = Number(verdi);
  return Number.isInteger(dag) && dag >= 1 && dag <= 24 ? dag : null;
}

// Middleware

function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/register');

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/register');
  }
}

async function adminOnly(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).send('Ingen tilgang');
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Kalender

app.get('/', async (req, res) => {
  const idag = dagIDesember(req);
  const luker = await Luke.find()
    .select('dag winner')
    .populate('winner', 'email')
    .sort('dag');

  res.render('index', {
    luker,
    idag,
    visTestdag: !ER_PROD
  });
});

app.get('/luke/:dag', auth, async (req, res) => {
  const dag = lesDag(req.params.dag);
  if (!dag) return res.status(404).send('Fant ikke luka.');

  const idag = dagIDesember(req);
  if (dag > idag) {
    return res.status(403).send('Denne luka er ikke åpen ennå!');
  }

  const luke = await Luke.findOne({ dag })
    .select('-correct_answer')
    .populate('winner', 'email');
  if (!luke) return res.status(404).send('Fant ikke luka.');

  const svar = await Svar.findOne({ user: req.userId, luke: luke._id });

  // Riktig/galt vises først når luka er stengt, så fasiten ikke spres samme dag
  const lukket = dag < idag;

  res.render('luke', { luke, svar, lukket });
});

app.post('/luke/:dag', auth, async (req, res) => {
  const dag = lesDag(req.params.dag);
  if (!dag) return res.status(404).send('Fant ikke luka.');

  if (dag > dagIDesember(req)) {
    return res.status(403).send('Denne luka er ikke åpen ennå!');
  }

  const luke = await Luke.findOne({ dag });
  if (!luke) return res.status(404).send('Fant ikke luka.');

  // Flervalg rettes automatisk, åpne svar rettes av lærer (null = venter)
  const correct = luke.type === 'multiple_choice'
    ? req.body.answer === luke.correct_answer
    : null;

  try {
    await Svar.create({
      user: req.userId,
      luke: luke._id,
      answer: req.body.answer,
      correct
    });
    res.redirect(`/luke/${dag}`);
  } catch (err) {
    if (err.code === 11000) {
      return res.send('Du har allerede svart på denne luka.');
    }
    if (err.name === 'ValidationError') {
      return res.status(400).send('Svaret kan ikke være tomt.');
    }
    console.error(err);
    res.status(500).send('Noe gikk galt, prøv igjen.');
  }
});

// Dashbord

app.get('/dashbord', auth, adminOnly, async (req, res) => {
  try {
    const valgtDag = lesDag(req.query.dag) || Math.min(dagIDesember(req), 24) || 1;

    const users = await User.find().sort({ email: 1 });
    const luke = await Luke.findOne({ dag: valgtDag });
    const svar = luke ? await Svar.find({ luke: luke._id }) : [];

    const antall = {
      riktig: svar.filter(s => s.correct === true).length,
      galt:   svar.filter(s => s.correct === false).length,
      venter: svar.filter(s => s.correct === null).length,
      total:  svar.length
    };

    res.render('dashbord', { users, valgtDag, antall });
  } catch (err) {
    console.error(err);
    res.status(500).send('Kunne ikke hente data');
  }
});

// Testdag

app.post('/testdag', (req, res) => {
  if (ER_PROD) return res.sendStatus(404);

  const dag = Number(req.body.dag);
  if (Number.isInteger(dag) && dag >= 0 && dag <= 25) {
    res.cookie('testdag', String(dag));
  }
  res.redirect('/');
});

// Registrering og innlogging

app.get('/register', (req, res) => {
  res.render('register', { feil: null });
});

app.post('/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!/^[^\s@]+@afk\.no$/.test(email)) {
    return res.status(400).render('register', {
      feil: 'Bruk AFK-e-posten din (navn@afk.no).'
    });
  }

  try {
    // Finnes brukeren fra før, logges den inn igjen i stedet for å bli låst ute
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ email });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).render('register', { feil: 'Noe gikk galt, prøv igjen.' });
  }
});

// Oppstart

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Koblet til MongoDB');
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
  })
  .catch(err => console.error('Klarte ikke koble til MongoDB:', err));