require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

async function lagAdmin() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.log('Bruk: npm run admin -- navn@afk.no');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOneAndUpdate(
    { email },
    { role: 'admin' },
    { new: true }
  );

  if (user) {
    console.log(`${user.email} er nå admin`);
  } else {
    console.log(`Fant ingen bruker med e-post ${email}. Registrer deg på /register først.`);
  }

  await mongoose.disconnect();
}

lagAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});