require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ai-study-companion-server', time: new Date().toISOString() });
});

// Day 1+ routes (stubs — implemented next commits)
// app.use('/api/auth', require('./src/routes/auth'));
// app.use('/api/spaces', require('./src/routes/spaces'));
// app.use('/api/projects', require('./src/routes/projects'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

connectDB(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Server on :${PORT}`)))
  .catch((e) => {
    console.error('DB failed:', e.message);
    // still listen for health check in Day 0 so deploy can be verified
    app.listen(PORT, () => console.log(`Server (no DB) on :${PORT}`));
  });
