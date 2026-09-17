require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../server/src/models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const demoPass = await bcrypt.hash('demo123', 10);
  const adminPass = await bcrypt.hash('admin123', 10);
  await User.updateOne({ email: 'demo@test.com' }, { $set: { name: 'Demo', passwordHash: demoPass } }, { upsert: true });
  await User.updateOne({ email: 'admin@test.com' }, { $set: { name: 'Admin', passwordHash: adminPass, isAdmin: true } }, { upsert: true });
  console.log('Seeded demo@test.com/demo123 + admin@test.com/admin123');
  await mongoose.disconnect();
}
seed().catch((e) => { console.error(e); process.exit(1); });
