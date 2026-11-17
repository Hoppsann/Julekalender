const express = require('express');
const path = require('path');
const app = express();
const mongoose = require("mongoose")
const env = require("dotenv")
env.config();

const PORT = process.env.PORT || 4000;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/register', (req, res) => {
  res.render('register');
});


mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Koblet til MongoDB');
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
  })
  .catch(err => console.error('Klarte ikke koble til MongoDB:', err));