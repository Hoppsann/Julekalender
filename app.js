const express = require('express');
const path = require('path');
const app = express();
const mongoose = require("mongoose")
const env = require("dotenv")
env.config();

const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('./models/user');
const Luke = require('./models/luke');
const Svar = require('./models/svar');

const PORT = process.env.PORT || 4000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

app.get('/luke/:dag', auth, async (req, res) => {
  const dag = Number(req.params.dag);
if (dag > dagIDesember(req)) {
    return res.status(403).send('Denne luka er ikke åpen ennå!');
  }

  const luke = await Luke.findOne({ dag })
    .select('-correct_answer')
    .populate('winner', 'email');
  if (!luke) return res.status(404).send('Fant ikke luka.');

  const svar = await Svar.findOne({ user: req.userId, luke: luke._id });
  res.render('luke', { luke, svar });
});

app.post('/luke/:dag', auth, async (req, res) => {
  const dag = Number(req.params.dag);
  if (dag > dagIDesember(req)) {
    return res.status(403).send('Denne luka er ikke åpen ennå!');
  }

  const luke = await Luke.findOne({ dag });
  if (!luke) return res.status(404).send('Fant ikke luka.');

  try {
    await Svar.create({ user: req.userId, luke: luke._id, answer: req.body.answer });
    res.redirect(`/luke/${dag}`);
  } catch (err) {
    if (err.code === 11000) {
      return res.send('Du har allerede svart på denne luka.');
    }
    console.error(err);
    res.status(500).send('Noe gikk galt, prøv igjen.');
  }
});

function dagIDesember(req) {
  if (process.env.NODE_ENV !== 'production' && req.cookies.testdag) {
    return Number(req.cookies.testdag);
  }
  const [aar, mnd, dag] = new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })
    .split('-')
    .map(Number);
  return mnd === 12 ? dag : 0;
}

app.get('/', async (req, res) => {
  const idag = dagIDesember(req);
  const luker = await Luke.find()
    .select('dag winner')
    .populate('winner', 'email')
    .sort('dag');

  res.render('index', {
    luker,
    idag,
    visTestdag: process.env.NODE_ENV !== 'production'
  });
});

app.post('/testdag', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.sendStatus(404);
  res.cookie('testdag', req.body.dag);
  res.redirect('/');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.create({ email });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.redirect('/');
  } catch (err) {
    if (err.code === 11000) {
      return res.send('Denne e-posten er allerede registrert.');
    }
    console.error(err);
    res.status(500).send('Noe gikk galt, prøv igjen.');
  }
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Koblet til MongoDB');
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
  })
  .catch(err => console.error('Klarte ikke koble til MongoDB:', err));