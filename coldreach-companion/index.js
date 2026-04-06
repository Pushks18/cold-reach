require('dotenv').config();
const { createServer } = require('./src/server');
const { createPipeline } = require('./src/pipeline');
const { startScheduler } = require('./src/scheduler');
const { loadProfile } = require('./src/profile-loader');

const PORT = process.env.PORT || 3333;
const INTERVAL = parseInt(process.env.SCHEDULER_INTERVAL_MINUTES, 10) || 120;
const PROFILE_PATH = process.env.CHROME_PROFILE_PATH || null;

async function main() {
  // Load profile.json + extract resume PDF on startup
  loadProfile();

  const pipeline = await createPipeline({ profilePath: PROFILE_PATH });
  const app = createServer({ pipeline });

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[coldreach-companion] listening on http://localhost:${PORT}`);
  });

  startScheduler({ pipeline, intervalMinutes: INTERVAL });
}

main().catch((err) => {
  console.error('[coldreach-companion] fatal:', err);
  process.exit(1);
});
