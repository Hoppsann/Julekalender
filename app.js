const express = require('express');
const path = require('path');
const app = express();
const mongoose = require("mongoose")
const env = require("dotenv")
env.config();

const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('./models/user');

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

app.get('/', (req, res) => {
  res.render('index');
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