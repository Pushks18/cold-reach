const { newPage } = require('./scraper');
const { upsertJob } = require('./job-deduplicator');
const { upsertCompany, logScrapeEvent } = require('./deduplicator');

const MAX_RESULTS = 25;

async function scrapeLinkedInJobs(keywords, location, profilePath) {
  const enc = encodeURIComponent;
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${enc(keywords)}&location=${enc(location)}`;
  const page = await newPage(profilePath);
  const jobs = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.jobs-search__results-list li', { timeout: 10000 });

    const items = await page.$$('.jobs-search__results-list li');
    const limit = Math.min(items.length, MAX_RESULTS);

    for (let i = 0; i < limit; i++) {
      try {
        const item = items[i];
        const title = await item.$eval('.base-search-card__title', el => el.textContent.trim()).catch(() => '');
        const company = await item.$eval('.base-search-card__subtitle', el => el.textContent.trim()).catch(() => '');
        const location_text = await item.$eval('.job-search-card__location', el => el.textContent.trim()).catch(() => '');
        const job_url = await item.$eval('a.base-card__full-link', el => el.href).catch(() => '');

        if (!title || !job_url) continue;

        jobs.push({
          title,
          company,
          location: location_text,
          job_url,
          description: null,
          posted_at: null,
          apply_method: 'linkedin-easy-apply',
          salary_range: null,
        });
      } catch (itemErr) {
        console.warn('[job-scraper] linkedin item parse error:', itemErr.message);
      }
    }
  } finally {
    await page.close();
  }

  return jobs;
}

async function scrapeIndeedJobs(keywords, location, profilePath) {
  const enc = encodeURIComponent;
  const searchUrl = `https://www.indeed.com/jobs?q=${enc(keywords)}&l=${enc(location)}`;
  const page = await newPage(profilePath);
  const jobs = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.job_seen_beacon', { timeout: 10000 });

    const items = await page.$$('.job_seen_beacon');
    const limit = Math.min(items.length, MAX_RESULTS);

    for (let i = 0; i < limit; i++) {
      try {
        const item = items[i];
        const titleEl = await item.$('.jobTitle a');
        const title = titleEl ? (await titleEl.textContent()).trim() : '';
        const job_url = titleEl ? await titleEl.getAttribute('href') : '';
        const company = await item.$eval('.companyName', el => el.textContent.trim()).catch(() => '');
        const location_text = await item.$eval('.companyLocation', el => el.textContent.trim()).catch(() => '');

        if (!title || !job_url) continue;

        const fullUrl = job_url.startsWith('http') ? job_url : `https://www.indeed.com${job_url}`;

        jobs.push({
          title,
          company,
          location: location_text,
          job_url: fullUrl,
          description: null,
          posted_at: null,
          apply_method: 'external',
          salary_range: null,
        });
      } catch (itemErr) {
        console.warn('[job-scraper] indeed item parse error:', itemErr.message);
      }
    }
  } finally {
    await page.close();
  }

  return jobs;
}

async function scrapeGlassdoorJobs(keywords, location, profilePath) {
  const enc = encodeURIComponent;
  const searchUrl = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${enc(keywords)}&locT=C&locId=1147401`;
  const page = await newPage(profilePath);
  const jobs = [];

  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-test="jobListing"]', { timeout: 10000 });

    const items = await page.$$('[data-test="jobListing"]');
    const limit = Math.min(items.length, MAX_RESULTS);

    for (let i = 0; i < limit; i++) {
      try {
        const item = items[i];
        const title = await item.$eval('[data-test="jobTitle"]', el => el.textContent.trim()).catch(() => '');
        const company = await item.$eval('[data-test="employer-name"]', el => el.textContent.trim()).catch(() => '');
        const location_text = await item.$eval('[data-test="location"]', el => el.textContent.trim()).catch(() => '');
        const linkEl = await item.$('a[data-test="jobTitle"]') || await item.$('a');
        const job_url = linkEl ? await linkEl.getAttribute('href') : '';

        if (!title || !job_url) continue;

        const fullUrl = job_url.startsWith('http') ? job_url : `https://www.glassdoor.com${job_url}`;

        jobs.push({
          title,
          company,
          location: location_text,
          job_url: fullUrl,
          description: null,
          posted_at: null,
          apply_method: 'external',
          salary_range: null,
        });
      } catch (itemErr) {
        console.warn('[job-scraper] glassdoor item parse error:', itemErr.message);
      }
    }
  } finally {
    await page.close();
  }

  return jobs;
}

const PLATFORM_SCRAPERS = {
  linkedin: scrapeLinkedInJobs,
  indeed: scrapeIndeedJobs,
  glassdoor: scrapeGlassdoorJobs,
};

async function runJobSearch({ criteria, profilePath }) {
  let totalSavedCount = 0;

  for (const criterion of criteria) {
    const { keywords, location, platforms = ['linkedin', 'indeed', 'glassdoor'], id: criteriaId } = criterion;

    for (const platform of platforms) {
      const scraper = PLATFORM_SCRAPERS[platform];
      if (!scraper) {
        console.warn(`[job-scraper] unknown platform: ${platform}`);
        continue;
      }

      const enc = encodeURIComponent;
      const searchUrl = platform === 'linkedin'
        ? `https://www.linkedin.com/jobs/search/?keywords=${enc(keywords)}&location=${enc(location)}`
        : platform === 'indeed'
          ? `https://www.indeed.com/jobs?q=${enc(keywords)}&l=${enc(location)}`
          : `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${enc(keywords)}&locT=C&locId=1147401`;

      let jobs = [];
      try {
        jobs = await scraper(keywords, location, profilePath);
        console.log(`[job-scraper] ${platform}: found ${jobs.length} jobs for "${keywords}" in "${location}"`);
      } catch (err) {
        console.error(`[job-scraper] ${platform} scrape failed:`, err.message);
        continue;
      }

      let platformSaved = 0;
      for (const job of jobs) {
        try {
          // Upsert company if we have a company name
          if (job.company) {
            try {
              await upsertCompany(job.company, null);
            } catch (companyErr) {
              console.warn('[job-scraper] upsertCompany failed:', companyErr.message);
            }
          }

          const { isNew } = await upsertJob(job);
          if (isNew) platformSaved++;
        } catch (jobErr) {
          console.warn('[job-scraper] upsertJob failed:', jobErr.message);
        }
      }

      totalSavedCount += platformSaved;

      try {
        await logScrapeEvent('job-scraper-' + platform, searchUrl, jobs.length);
      } catch (logErr) {
        console.warn('[job-scraper] logScrapeEvent failed:', logErr.message);
      }
    }
  }

  return totalSavedCount;
}

module.exports = {
  scrapeLinkedInJobs,
  scrapeIndeedJobs,
  scrapeGlassdoorJobs,
  runJobSearch,
};
