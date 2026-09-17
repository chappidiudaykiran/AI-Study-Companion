const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI missing. Copy .env.example to .env');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

module.exports = { connectDB };
