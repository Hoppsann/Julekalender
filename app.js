const express = require('express');
const path = require('path');
const app = express();
const mongoose = require("mongoose")
const env = require("dotenv")
env.config();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGODB_URI)

app.get('/', (req, res) => {
  res.render('index');
});


app.get('/register', (req, res) => {
  res.render('register');
});

app.listen(process.env.PORT)