const express = require('express');
const { version } = require('../package.json');
const { getSupabase } = require('./supabase-client');
const { runJobSearch } = require('./job-scraper');
const { findRecruitersForCompanies } = require('./recruiter-finder');
const { runFullPipeline } = require('./linkedin-pipeline');
const { applyToJob, autoApplyAll } = require('./auto-apply');
const { listResumes } = require('./resume-selector');

function createServer({ pipeline }) {
  const app = express();
  app.use(express.json());

  // Allow Chrome extension origin
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/status', (_req, res) => {
    res.json({ status: 'ok', version });
  });

  app.post('/scrape', async (req, res) => {
    const { urls = [], companies = [] } = req.body;
    if (!urls.length && !companies.length) {
      return res.status(400).json({ error: 'urls or companies required' });
    }
    try {
      const results = await pipeline.run({ urls, companies });
      res.json({ success: true, results });
    } catch (err) {
      console.error('[server] scrape error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /jobs — list jobs, optionally filtered by status
  app.get('/jobs', async (req, res) => {
    const { status, limit = '20' } = req.query;
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit, 10));
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      res.json({ success: true, jobs: data });
    } catch (err) {
      console.error('[server] /jobs error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /profile — return first user_profile row
  app.get('/profile', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_profile')
        .select('*')
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw new Error(error.message);
      res.json({ success: true, profile: data || null });
    } catch (err) {
      console.error('[server] GET /profile error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /profile — upsert user_profile
  app.put('/profile', async (req, res) => {
    const {
      full_name, email, phone, location, linkedin_url,
      resume_text, resume_pdf_url, skills,
      preferred_roles, preferred_locations,
      min_salary, job_types,
    } = req.body;

    try {
      const supabase = getSupabase();

      // Fetch existing profile id if any
      const { data: existing } = await supabase
        .from('user_profile')
        .select('id')
        .limit(1)
        .single();

      const payload = Object.fromEntries(
        Object.entries({
          ...(existing ? { id: existing.id } : {}),
          full_name, email, phone, location, linkedin_url,
          resume_text, resume_pdf_url, skills,
          preferred_roles, preferred_locations,
          min_salary, job_types,
        }).filter(([, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from('user_profile')
        .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
        .select()
        .single();

      if (error) throw new Error(error.message);
      res.json({ success: true, profile: data });
    } catch (err) {
      console.error('[server] PUT /profile error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /scrape-jobs — trigger a job search
  app.post('/scrape-jobs', async (req, res) => {
    const { keywords, location, platforms } = req.body;
    if (!keywords || !location) {
      return res.status(400).json({ error: 'keywords and location are required' });
    }
    try {
      const criteria = [{ keywords, location, platforms: platforms || ['linkedin', 'indeed', 'glassdoor'] }];
      const savedCount = await runJobSearch({
        criteria,
        profilePath: process.env.CHROME_PROFILE_PATH,
      });
      res.json({ success: true, savedCount });
    } catch (err) {
      console.error('[server] /scrape-jobs error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /run-pipeline — full autonomous run: search internships → find companies → find recruiters
  app.post('/run-pipeline', async (req, res) => {
    const { geoId, maxCompanies } = req.body || {};
    // Run async — respond immediately so the client doesn't timeout
    res.json({ success: true, message: 'Pipeline started — check companion terminal for progress' });
    runFullPipeline({
      profilePath: process.env.CHROME_PROFILE_PATH,
      geoId,
      maxCompanies,
    }).catch(err => console.error('[server] pipeline error:', err.message));
  });

  // POST /apply — apply to a single job
  app.post('/apply', async (req, res) => {
    const { job_id, dry_run = true } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id required' });
    try {
      const result = await applyToJob({
        jobId: job_id,
        dryRun: dry_run,
        profilePath: process.env.CHROME_PROFILE_PATH,
      });
      res.json(result);
    } catch (err) {
      console.error('[server] /apply error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /auto-apply-all — apply to all saved Easy Apply jobs
  app.post('/auto-apply-all', async (req, res) => {
    const { dry_run = true, limit = 20 } = req.body || {};
    res.json({ success: true, message: `Auto-apply started (${dry_run ? 'DRY RUN' : 'LIVE'}) — check companion terminal` });
    autoApplyAll({
      dryRun: dry_run,
      limit,
      profilePath: process.env.CHROME_PROFILE_PATH,
    }).catch(err => console.error('[server] auto-apply error:', err.message));
  });

  // GET /resumes — list available resumes
  app.get('/resumes', (_req, res) => {
    res.json({ resumes: listResumes() });
  });

  // POST /find-recruiters — given company names, find HR/recruiting contacts via Playwright
  app.post('/find-recruiters', async (req, res) => {
    const { companies = [] } = req.body;
    if (!companies.length) return res.status(400).json({ error: 'companies array required' });
    res.json({ success: true, message: `Recruiter pipeline started for ${companies.length} companies — check terminal` });
    findRecruitersForCompanies(companies, process.env.CHROME_PROFILE_PATH)
      .then(results => {
        const total = results.reduce((sum, r) => sum + r.found, 0);
        console.log(`[server] /find-recruiters done: ${total} recruiters across ${companies.length} companies`);
      })
      .catch(err => console.error('[server] /find-recruiters error:', err.message));
  });

  // POST /recruiter-pipeline — full recruiter pipeline: search jobs → get companies → find recruiters + emails
  // Same as /run-pipeline but ONLY the recruiter part (skip applying)
  app.post('/recruiter-pipeline', async (req, res) => {
    const { companies, geoId, maxCompanies = 40 } = req.body || {};
    if (companies && companies.length) {
      // Direct company list provided — just find recruiters
      res.json({ success: true, message: `Recruiter pipeline started for ${companies.length} companies — check terminal` });
      findRecruitersForCompanies(companies, process.env.CHROME_PROFILE_PATH)
        .catch(err => console.error('[server] recruiter-pipeline error:', err.message));
    } else {
      // No companies — run full job search first, then find recruiters (no auto-apply)
      res.json({ success: true, message: 'Full recruiter pipeline started (jobs → companies → recruiters) — check terminal' });
      runFullPipeline({ profilePath: process.env.CHROME_PROFILE_PATH, geoId, maxCompanies })
        .catch(err => console.error('[server] recruiter-pipeline error:', err.message));
    }
  });

  return app;
}

module.exports = { createServer };
