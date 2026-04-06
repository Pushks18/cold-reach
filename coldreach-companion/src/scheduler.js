const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getJobSearchCriteria, updateCriteriaLastRun } = require('./job-deduplicator');
const { runJobSearch } = require('./job-scraper');
const { runFullPipeline } = require('./linkedin-pipeline');
const { autoApplyAll } = require('./auto-apply');

const WATCHLIST_PATH = path.join(__dirname, '../watchlist.json');

let currentTask = null;
let jobTask = null;

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

  // Job scraping task — runs at double the interval to reduce frequency
  const jobIntervalMinutes = intervalMinutes * 2;
  const jobCronExpr = buildCronExpression(jobIntervalMinutes);

  if (!jobCronExpr || !cron.validate(jobCronExpr)) {
    console.warn(`[scheduler] invalid job interval ${jobIntervalMinutes}m, skipping job scheduler`);
    return;
  }

  jobTask = cron.schedule(jobCronExpr, async () => {
    console.log('[scheduler] running scheduled job search...');
    let criteria;
    try {
      criteria = await getJobSearchCriteria();
    } catch (err) {
      console.error('[scheduler] failed to load job search criteria:', err.message);
      return;
    }

    if (!criteria.length) {
      console.log('[scheduler] no active job search criteria, skipping');
      return;
    }

    try {
      const savedCount = await runJobSearch({
        criteria,
        profilePath: process.env.CHROME_PROFILE_PATH,
      });
      console.log(`[scheduler] job search done — ${savedCount} new jobs saved`);

      // Update last_run_at for each criterion that has an id
      for (const criterion of criteria) {
        if (criterion.id) {
          try {
            await updateCriteriaLastRun(criterion.id);
          } catch (updateErr) {
            console.warn('[scheduler] updateCriteriaLastRun failed:', updateErr.message);
          }
        }
      }
    } catch (err) {
      console.error('[scheduler] job search error:', err.message);
    }
  });

  console.log(`[scheduler] job search running every ${jobIntervalMinutes} minutes`);

  // LinkedIn full pipeline — runs once a day at 8am
  cron.schedule('0 8 * * *', async () => {
    console.log('[scheduler] running daily LinkedIn internship pipeline...');
    try {
      const result = await runFullPipeline({ profilePath: process.env.CHROME_PROFILE_PATH });
      console.log(`[scheduler] pipeline done — ${result.jobs} jobs, ${result.recruiters} recruiters`);
    } catch (err) {
      console.error('[scheduler] pipeline error:', err.message);
    }
  });

  console.log('[scheduler] LinkedIn pipeline scheduled daily at 8am');

  // Auto-apply — runs at 9am (after pipeline finds jobs at 8am) and again at 9pm
  cron.schedule('0 9 * * *', async () => {
    console.log('[scheduler] running morning auto-apply batch...');
    try {
      const result = await autoApplyAll({
        dryRun: process.env.AUTO_APPLY_LIVE !== 'true', // dry_run unless explicitly enabled
        limit: 30,
        profilePath: process.env.CHROME_PROFILE_PATH,
      });
      console.log(`[scheduler] auto-apply done — ${result.applied}/${result.total}`);
    } catch (err) {
      console.error('[scheduler] auto-apply error:', err.message);
    }
  });

  cron.schedule('0 21 * * *', async () => {
    console.log('[scheduler] running evening auto-apply batch...');
    try {
      // Evening run: find new jobs first, then apply
      await runFullPipeline({ profilePath: process.env.CHROME_PROFILE_PATH });
      const result = await autoApplyAll({
        dryRun: process.env.AUTO_APPLY_LIVE !== 'true',
        limit: 30,
        profilePath: process.env.CHROME_PROFILE_PATH,
      });
      console.log(`[scheduler] evening batch done — ${result.applied}/${result.total}`);
    } catch (err) {
      console.error('[scheduler] evening batch error:', err.message);
    }
  });

  console.log(`[scheduler] auto-apply scheduled at 9am & 9pm (mode: ${process.env.AUTO_APPLY_LIVE === 'true' ? 'LIVE' : 'DRY RUN'})`);
  console.log('[scheduler] set AUTO_APPLY_LIVE=true in .env to enable real submissions');
}

function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
    console.log('[scheduler] stopped');
  }
  if (jobTask) {
    jobTask.stop();
    jobTask = null;
    console.log('[scheduler] job task stopped');
  }
}

module.exports = { startScheduler, stopScheduler, loadWatchlist, buildCronExpression };
