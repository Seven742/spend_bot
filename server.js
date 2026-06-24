// server.js
// Application entry point: loads env vars, connects to MongoDB, launches
// the Telegram bot (long polling), and starts a small Express server for
// health checks (useful on hosting platforms like Render.com).

require('dotenv').config();

// --- Fail fast with a clear message if required env vars are missing ---
// (otherwise Mongoose/Telegraf throw confusing low-level errors instead)
const REQUIRED_ENV_VARS = ['BOT_TOKEN', 'MONGO_URI'];
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variable(s): ${missingVars.join(', ')}`);
  console.error('   1. Make sure a .env file exists in the project root: cp .env.example .env');
  console.error('   2. Fill in real values for BOT_TOKEN and MONGO_URI inside it');
  console.error('   3. If deploying on Render.com (or similar), set these in the dashboard\'s');
  console.error('      "Environment" tab instead — .env files in the repo are not read there.');
  process.exit(1);
}

const express = require('express');
const connectDB = require('./config/db');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('SpendBot is running ✅'));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

const start = async () => {
  // 1. Connect to MongoDB first — the bot can't safely run without it
  await connectDB();

  // 2. Launch the Telegram bot (long polling mode)
  await bot.launch();
  console.log('🤖 SpendBot is up and running!');

  // 3. Start the Express server (health checks only — not used by the bot itself)
  app.listen(PORT, () => console.log(`🌐 Express server listening on port ${PORT}`));

  // Graceful shutdown on process termination
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

start().catch((err) => {
  console.error('❌ Failed to start SpendBot:', err);
  process.exit(1);
});
