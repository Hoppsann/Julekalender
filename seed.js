require('dotenv').config();
const mongoose = require('mongoose');
const Luke = require('./models/luke');
const questions = require('./data/questions');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  await Luke.deleteMany({});
  const luker = questions.map(({ id, ...resten }) => ({ dag: id, ...resten }));
  await Luke.insertMany(luker);

  console.log(`La inn ${luker.length} luker`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});