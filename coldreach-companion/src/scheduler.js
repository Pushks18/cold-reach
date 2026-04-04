const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const WATCHLIST_PATH = path.join(__dirname, '../watchlist.json');

let currentTask = null;

function loadWatchlist() {
  try {
    if (!fs.existsSync(WATCHLIST_PATH)) return [];
    return JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
  } catch (err) {
    console.warn('[scheduler] failed to load watchlist:', err.message);
    return [];
  }
}

function buildCronExpression(intervalMinutes) {
  if (intervalMinutes < 1) return null;
  if (intervalMinutes < 60) return `*/${intervalMinutes} * * * *`;
  const hours = Math.floor(intervalMinutes / 60);
  return `0 */${hours} * * *`;
}

function startScheduler({ pipeline, intervalMinutes = 120 }) {
  const cronExpr = buildCronExpression(intervalMinutes);

  if (!cronExpr || !cron.validate(cronExpr)) {
    console.warn(`[scheduler] invalid interval ${intervalMinutes}m, skipping scheduler`);
    return;
  }

  currentTask = cron.schedule(cronExpr, async () => {
    console.log('[scheduler] running scheduled scrape...');
    const watchlist = loadWatchlist();
    if (!watchlist.length) {
      console.log('[scheduler] watchlist empty, skipping');
      return;
    }
    try {
      const results = await pipeline.run({ urls: watchlist });
      console.log(`[scheduler] done — ${results.length} contacts found`);
    } catch (err) {
      console.error('[scheduler] scrape error:', err.message);
    }
  });

  console.log(`[scheduler] running every ${intervalMinutes} minutes`);
}

function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log('[scheduler] stopped');
  }
}

module.exports = { startScheduler, stopScheduler, loadWatchlist, buildCronExpression };
