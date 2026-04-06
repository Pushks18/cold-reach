// Fully autonomous LinkedIn pipeline:
// 1. Search LinkedIn Jobs for tech internships (last 24h)
// 2. Click into EACH job detail page — get full description + company URL
// 3. Extract all unique companies
// 4. Find recruiters/HR for each company
// 5. Aggressively find emails for each recruiter
// 6. Save everything to Supabase

const { newPage } = require('./scraper');
const { findRecruitersForCompanies } = require('./recruiter-finder');
const { upsertCompany, logScrapeEvent } = require('./deduplicator');
const { getDomain } = require('./enrichment');
const { getSupabase } = require('./supabase-client');

const TECH_INTERNSHIP_SEARCHES = [
  { keywords: 'software engineer intern', label: 'SWE Intern' },
  { keywords: 'software developer intern', label: 'Dev Intern' },
  { keywords: 'machine learning intern', label: 'ML Intern' },
  { keywords: 'data science intern', label: 'DS Intern' },
  { keywords: 'data engineer intern', label: 'DE Intern' },
  { keywords: 'backend engineer intern', label: 'Backend Intern' },
  { keywords: 'frontend engineer intern', label: 'Frontend Intern' },
  { keywords: 'devops intern', label: 'DevOps Intern' },
  { keywords: 'cloud engineer intern', label: 'Cloud Intern' },
  { keywords: 'product management intern', label: 'PM Intern' },
];

function buildJobSearchUrl(keywords, geoId = '103644278') {
  const params = new URLSearchParams({
    keywords,
    f_TPR: 'r86400',
    f_JT: 'I',
    origin: 'JOB_SEARCH_PAGE_JOB_FILTER',
    geoId,
  });
  return `https://www.linkedin.com/jobs/search/?${params}`;
}

async function scrapeJobListings(page, url) {
  console.log(`[pipeline] Searching: ${url.split('?')[0]}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  await page.waitForSelector(
    '[data-job-id], .job-card-container, a[href*="/jobs/view/"]',
    { timeout: 12000 }
  ).catch(() => {});

  // Scroll to load more
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await new Promise(r => setTimeout(r, 500));
  }

  const jobs = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    // Method 1: data-job-id
    for (const card of document.querySelectorAll('[data-job-id]')) {
      const jobId = card.getAttribute('data-job-id');
      if (!jobId || seen.has(jobId)) continue;
      seen.add(jobId);

      const texts = Array.from(card.querySelectorAll('span,a,div'))
        .filter(el => el.childElementCount === 0)
        .map(el => el.innerText?.trim())
        .filter(t => t && t.length > 1);

      results.push({
        jobId,
        title: texts[0] || null,
        company: texts[1] || null,
        location: texts[2] || null,
        job_url: `https://www.linkedin.com/jobs/view/${jobId}/`,
      });
    }

    // Method 2: fallback via links
    if (!results.length) {
      for (const link of document.querySelectorAll('a[href*="/jobs/view/"]')) {
        const m = link.href.match(/\/jobs\/view\/(\d+)/);
        if (!m || seen.has(m[1])) continue;
        seen.add(m[1]);
        const card = link.closest('li') || link.parentElement;
        const texts = Array.from(card?.querySelectorAll('span,div') || [])
          .filter(el => el.childElementCount === 0)
          .map(el => el.innerText?.trim())
          .filter(t => t && t.length > 1);
        results.push({
          jobId: m[1],
          title: link.innerText?.trim() || texts[0],
          company: texts.find(t => t !== (link.innerText?.trim())) || null,
          location: null,
          job_url: `https://www.linkedin.com/jobs/view/${m[1]}/`,
        });
      }
    }

    return results;
  });

  return jobs;
}

async function scrapeJobDetail(page, job) {
  try {
    await page.goto(job.job_url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const detail = await page.evaluate(() => {
      // Full job description
      const descEl = document.querySelector(
        '.jobs-description__content, [class*="description"], [class*="job-details"]'
      );
      const description = descEl?.innerText?.trim()?.slice(0, 2000) || null;

      // Company LinkedIn URL from job detail
      const companyLink = document.querySelector('a[href*="/company/"]');
      const companyUrl = companyLink?.href?.split('?')[0] || null;
      const companyName = companyLink?.innerText?.trim() || null;

      // Apply method detection
      const bodyText = document.body.innerText.toLowerCase();
      let applyMethod = 'external';
      if (bodyText.includes('easy apply')) applyMethod = 'linkedin-easy-apply';

      // Salary if visible
      const salaryEl = Array.from(document.querySelectorAll('span,li'))
        .find(el => el.innerText?.match(/\$[\d,]+/));
      const salaryRange = salaryEl?.innerText?.trim() || null;

      return { description, companyUrl, companyName, applyMethod, salaryRange };
    });

    return detail;
  } catch (err) {
    console.warn(`[pipeline] detail scrape failed for ${job.job_url}: ${err.message}`);
    return {};
  }
}

async function saveJobToDB(job, detail) {
  const supabase = getSupabase();
  try {
    const company = detail.companyName || job.company;
    let companyId = null;

    if (company) {
      const domain = await getDomain(company);
      const { data } = await supabase
        .from('companies')
        .upsert(
          { name: company, domain: domain || undefined },
          { onConflict: 'name', ignoreDuplicates: true }
        )
        .select('id')
        .single();
      companyId = data?.id || null;
    }

    await supabase.from('jobs').upsert({
      title: job.title,
      company_id: companyId,
      job_url: job.job_url,
      location: job.location,
      description: detail.description || null,
      apply_method: detail.applyMethod || 'external',
      salary_range: detail.salaryRange || null,
      job_type: 'internship',
      status: 'saved',
    }, { onConflict: 'job_url', ignoreDuplicates: true });
  } catch (err) {
    console.warn(`[pipeline] save job failed: ${err.message}`);
  }
}

async function runFullPipeline({ profilePath, geoId, maxCompanies = 40 } = {}) {
  const profile = profilePath || process.env.CHROME_PROFILE_PATH;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  ColdReach — Full Internship Pipeline Starting      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── PHASE 1: Collect jobs from search results ──

  console.log('─── PHASE 1: Searching LinkedIn Jobs (last 24h) ───\n');

  const page = await newPage(profile);
  const allJobs = [];
  const seenJobIds = new Set();

  try {
    for (const search of TECH_INTERNSHIP_SEARCHES) {
      console.log(`[pipeline] 🔍 "${search.keywords}"`);
      const url = buildJobSearchUrl(search.keywords, geoId);
      const jobs = await scrapeJobListings(page, url);
      const newJobs = jobs.filter(j => {
        if (seenJobIds.has(j.jobId)) return false;
        seenJobIds.add(j.jobId);
        return true;
      });
      console.log(`[pipeline]    ${newJobs.length} new jobs (${jobs.length} total, ${allJobs.length + newJobs.length} cumulative)`);
      allJobs.push(...newJobs);
      await new Promise(r => setTimeout(r, 1500));
    }
  } finally {
    await page.close().catch(() => {});
  }

  console.log(`\n[pipeline] Total unique jobs found: ${allJobs.length}\n`);

  // ── PHASE 2: Click into each job detail page ──

  console.log('─── PHASE 2: Visiting each job detail page ───\n');

  const companySet = new Map(); // company name → { companyUrl, jobCount }

  for (let i = 0; i < allJobs.length; i++) {
    const job = allJobs[i];
    const detailPage = await newPage(profile);
    try {
      console.log(`[pipeline] [${i + 1}/${allJobs.length}] ${job.title} @ ${job.company}`);
      const detail = await scrapeJobDetail(detailPage, job);

      // Save job with full details
      await saveJobToDB(job, detail);

      // Track company
      const company = detail.companyName || job.company;
      if (company) {
        if (!companySet.has(company)) {
          companySet.set(company, { companyUrl: detail.companyUrl, jobCount: 0 });
        }
        companySet.get(company).jobCount++;
      }
    } finally {
      await detailPage.close().catch(() => {});
    }

    // Rate limit — don't hammer LinkedIn
    await new Promise(r => setTimeout(r, 1000));
  }

  // ── PHASE 3: Find recruiters for each company ──

  const companies = [...companySet.keys()].slice(0, maxCompanies);

  console.log(`\n─── PHASE 3: Finding recruiters for ${companies.length} companies ───\n`);
  console.log('[pipeline] Companies:', companies.join(', '));
  console.log('');

  await logScrapeEvent('linkedin-pipeline-jobs', 'linkedin-jobs-search', allJobs.length);

  const recruiterResults = await findRecruitersForCompanies(companies, profile);
  const totalRecruiters = recruiterResults.reduce((s, r) => s + r.found, 0);

  // ── DONE ──

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  DONE                                                ║`);
  console.log(`║  Jobs scraped:      ${String(allJobs.length).padEnd(33)}║`);
  console.log(`║  Companies found:   ${String(companies.length).padEnd(33)}║`);
  console.log(`║  Recruiters saved:  ${String(totalRecruiters).padEnd(33)}║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  return {
    jobs: allJobs.length,
    companies: companies.length,
    recruiters: totalRecruiters,
    details: recruiterResults,
  };
}

module.exports = { runFullPipeline };
