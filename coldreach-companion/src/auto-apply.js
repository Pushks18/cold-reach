// LinkedIn Easy Apply automation via Playwright
// Uses local Ollama LLM for answering screening questions

const path = require('path');
const { newPage } = require('./scraper');
const { selectResume } = require('./resume-selector');
const { answerQuestion, extractNumber, isOllamaRunning } = require('./local-llm');
const { getSupabase } = require('./supabase-client');
const { loadProfile, getResumeText } = require('./profile-loader');

const SCREENSHOTS_DIR = path.join(__dirname, '../screenshots');

async function ensureScreenshotsDir() {
  const fs = require('fs');
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function getUserProfile() {
  // Try profile.json first, fall back to Supabase
  const local = loadProfile();
  if (local) return local;
  const supabase = getSupabase();
  const { data } = await supabase.from('user_profile').select('*').limit(1).single();
  return data;
}

async function fillTextField(page, selector, value) {
  try {
    const el = page.locator(selector).first();
    if (await el.count() > 0 && await el.isVisible()) {
      await el.fill(value);
      return true;
    }
  } catch {}
  return false;
}

async function clickButton(page, text) {
  try {
    const btn = page.locator(`button:has-text("${text}"), [aria-label*="${text}"]`).first();
    if (await btn.count() > 0 && await btn.isVisible()) {
      await btn.click();
      await new Promise(r => setTimeout(r, 1500));
      return true;
    }
  } catch {}
  return false;
}

async function handleFormPage(page, { profile, resumePath, jobTitle, company, resumeText }) {
  // Fill common fields if they appear
  const firstName = profile?.full_name?.split(' ')[0] || '';
  const lastName = profile?.full_name?.split(' ').slice(1).join(' ') || '';

  // Name fields
  await fillTextField(page, 'input[name*="first" i], input[id*="first" i], input[autocomplete="given-name"]', firstName);
  await fillTextField(page, 'input[name*="last" i], input[id*="last" i], input[autocomplete="family-name"]', lastName);
  await fillTextField(page, 'input[name*="name" i]:not([name*="first"]):not([name*="last"])', profile?.full_name || '');

  // Contact info
  await fillTextField(page, 'input[name*="email" i], input[type="email"]', profile?.email || '');
  await fillTextField(page, 'input[name*="phone" i], input[type="tel"]', profile?.phone || '');

  // LinkedIn URL
  await fillTextField(page, 'input[name*="linkedin" i]', profile?.linkedin_url || '');

  // Location
  await fillTextField(page, 'input[name*="location" i], input[name*="city" i]', profile?.location || '');

  // Resume upload
  if (resumePath) {
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    for (let i = 0; i < count; i++) {
      try {
        await fileInputs.nth(i).setInputFiles(resumePath);
        console.log('  [apply] resume uploaded');
        break;
      } catch {}
    }
  }

  // Handle text inputs with questions (labels)
  const labels = page.locator('label');
  const labelCount = await labels.count();
  for (let i = 0; i < labelCount; i++) {
    try {
      const label = labels.nth(i);
      const text = await label.innerText().catch(() => '');
      if (!text || text.length < 5) continue;

      // Find associated input
      const forId = await label.getAttribute('for').catch(() => null);
      let input = null;
      if (forId) {
        input = page.locator(`#${CSS.escape(forId)}`).first();
      } else {
        input = label.locator('input, textarea, select').first();
      }

      if (!input || await input.count() === 0) continue;
      const tagName = await input.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
      const currentVal = await input.inputValue().catch(() => '');

      // Skip if already filled
      if (currentVal && currentVal.length > 0) continue;

      // Get answer from LLM
      const answer = await answerQuestion({
        question: text,
        jobTitle,
        company,
        resumeText,
        profileInfo: `Name: ${profile?.full_name}, Location: ${profile?.location}, Skills: ${(profile?.skills || []).join(', ')}`,
      });

      if (!answer) continue;

      if (tagName === 'select') {
        // For dropdowns, try to find the best matching option
        const options = await input.locator('option').allInnerTexts().catch(() => []);
        const answerLower = answer.toLowerCase();
        const match = options.find(o => o.toLowerCase().includes(answerLower)) ||
                      options.find(o => answerLower.includes(o.toLowerCase())) ||
                      options[1]; // skip first (placeholder)
        if (match) {
          await input.selectOption({ label: match }).catch(() => {});
        }
      } else if (tagName === 'input') {
        const type = await input.getAttribute('type').catch(() => 'text');
        if (type === 'number') {
          const num = extractNumber(answer);
          if (num !== null) await input.fill(String(num)).catch(() => {});
        } else {
          await input.fill(answer).catch(() => {});
        }
      } else if (tagName === 'textarea') {
        await input.fill(answer).catch(() => {});
      }
    } catch {}
  }

  // Handle radio buttons / checkboxes with questions
  const fieldsets = page.locator('fieldset, [role="radiogroup"], [role="group"]');
  const fsCount = await fieldsets.count();
  for (let i = 0; i < fsCount; i++) {
    try {
      const fs = fieldsets.nth(i);
      const legend = await fs.locator('legend, span[class*="label"]').first().innerText().catch(() => '');
      if (!legend || legend.length < 5) continue;

      const answer = await answerQuestion({
        question: legend,
        jobTitle,
        company,
        resumeText,
        profileInfo: `Name: ${profile?.full_name}, Skills: ${(profile?.skills || []).join(', ')}`,
      });

      if (!answer) continue;

      // Click the radio/checkbox that best matches the answer
      const options = fs.locator('label, [role="radio"], [data-test-text-selectable-option]');
      const optCount = await options.count();
      for (let j = 0; j < optCount; j++) {
        const optText = await options.nth(j).innerText().catch(() => '');
        if (optText.toLowerCase().includes(answer.toLowerCase()) || answer.toLowerCase().includes(optText.toLowerCase())) {
          await options.nth(j).click().catch(() => {});
          break;
        }
      }
      // If "yes" answer, click first option; if "no", click second
      if (optCount >= 2 && answer.toLowerCase().startsWith('yes')) {
        await options.nth(0).click().catch(() => {});
      } else if (optCount >= 2 && answer.toLowerCase().startsWith('no')) {
        await options.nth(1).click().catch(() => {});
      }
    } catch {}
  }
}

async function applyToJob({ jobId, dryRun = true, profilePath }) {
  await ensureScreenshotsDir();
  const supabase = getSupabase();
  const profile = await getUserProfile();

  if (!profile) {
    return { success: false, error: 'No user profile found. Set up profile via PUT /profile first.' };
  }

  // Fetch job
  const { data: job } = await supabase.from('jobs').select('*, companies(name)').eq('id', jobId).single();
  if (!job) return { success: false, error: `Job ${jobId} not found` };

  const company = job.companies?.name || 'Unknown';
  console.log(`\n[auto-apply] Applying to: ${job.title} @ ${company}`);
  console.log(`[auto-apply] URL: ${job.job_url}`);
  console.log(`[auto-apply] Mode: ${dryRun ? 'DRY RUN (no submit)' : 'LIVE SUBMIT'}`);

  // Select resume
  const resumePath = selectResume(job.title);
  if (!resumePath) {
    return { success: false, error: 'No resume PDF found. Drop PDFs in resumes/ folder.' };
  }

  // Check Ollama
  const ollamaUp = await isOllamaRunning();
  if (!ollamaUp) {
    console.warn('[auto-apply] Ollama not running — will skip screening question answering');
  }

  // Rich resume text from profile.json for LLM context
  const resumeText = getResumeText();

  const page = await newPage(profilePath || process.env.CHROME_PROFILE_PATH);
  let screenshotPath = null;

  try {
    // Navigate to job
    await page.goto(job.job_url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2500));

    // Click Easy Apply button
    const easyApplyClicked = await clickButton(page, 'Easy Apply');
    if (!easyApplyClicked) {
      // Try alternative selectors
      const altBtn = page.locator('[class*="easy-apply"], button[aria-label*="Easy Apply"]').first();
      if (await altBtn.count() > 0) {
        await altBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      } else {
        return { success: false, error: 'Easy Apply button not found — this job may require external application' };
      }
    }

    // Process multi-step form (LinkedIn Easy Apply is usually 2-5 pages)
    for (let step = 0; step < 8; step++) {
      console.log(`  [apply] form step ${step + 1}`);
      await new Promise(r => setTimeout(r, 1000));

      // Fill current page
      await handleFormPage(page, {
        profile,
        resumePath: step === 0 ? resumePath : null, // upload resume on first page
        jobTitle: job.title,
        company,
        resumeText,
      });

      // Check for "Review" or "Submit" button (final step)
      const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Submit application"), button[aria-label*="Submit"]').first();
      if (await reviewBtn.count() > 0 && await reviewBtn.isVisible()) {
        // Take screenshot before submitting
        screenshotPath = path.join(SCREENSHOTS_DIR, `apply-${jobId}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  [apply] screenshot saved: ${screenshotPath}`);

        if (dryRun) {
          console.log('  [apply] DRY RUN — stopping before submit');
          break;
        }

        // LIVE SUBMIT
        await reviewBtn.click();
        await new Promise(r => setTimeout(r, 3000));

        // Check for success confirmation
        const bodyText = await page.innerText('body').catch(() => '');
        const success = bodyText.toLowerCase().includes('application submitted') ||
                        bodyText.toLowerCase().includes('applied') ||
                        bodyText.toLowerCase().includes('your application has been');

        if (success) {
          console.log('  [apply] ✓ Application submitted!');

          // Update job status
          await supabase.from('jobs').update({
            status: 'applied',
            applied_at: new Date().toISOString(),
          }).eq('id', jobId);

          // Create application record
          await supabase.from('applications').insert({
            job_id: jobId,
            sent_at: new Date().toISOString(),
          });
        }

        break;
      }

      // Click "Next" to go to next step
      const nextClicked = await clickButton(page, 'Next');
      if (!nextClicked) {
        await clickButton(page, 'Continue');
        if (!nextClicked) {
          console.log('  [apply] no Next/Continue/Submit button found — may be done');
          break;
        }
      }
    }

    return {
      success: true,
      dryRun,
      screenshotPath,
      job: { title: job.title, company, url: job.job_url },
    };

  } catch (err) {
    console.error(`[auto-apply] failed: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    await page.close().catch(() => {});
  }
}

// Apply to all saved Easy Apply jobs
async function autoApplyAll({ dryRun = true, limit = 20, profilePath } = {}) {
  const supabase = getSupabase();

  // Get saved jobs that are Easy Apply
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, apply_method')
    .eq('status', 'saved')
    .eq('apply_method', 'linkedin-easy-apply')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!jobs?.length) {
    console.log('[auto-apply] no Easy Apply jobs to apply to');
    return { applied: 0, total: 0 };
  }

  console.log(`\n[auto-apply] Found ${jobs.length} Easy Apply jobs`);

  let applied = 0;
  for (const job of jobs) {
    const result = await applyToJob({ jobId: job.id, dryRun, profilePath });
    if (result.success) applied++;
    await new Promise(r => setTimeout(r, 3000)); // delay between applications
  }

  console.log(`\n[auto-apply] Done: ${applied}/${jobs.length} ${dryRun ? 'dry-run' : 'applied'}`);
  return { applied, total: jobs.length };
}

module.exports = { applyToJob, autoApplyAll };
