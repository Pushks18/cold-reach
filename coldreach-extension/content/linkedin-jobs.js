(function() {

  const processedJobIds = new Set();

  function scrapeJobCards() {
    // LinkedIn 2026: job cards identified by data-job-id attribute
    const cards = Array.from(document.querySelectorAll('[data-job-id]'));
    let saved = 0;

    for (const card of cards) {
      const jobId = card.getAttribute('data-job-id');
      if (!jobId || processedJobIds.has(jobId)) continue;
      processedJobIds.add(jobId);

      const job_url = `https://www.linkedin.com/jobs/view/${jobId}/`;

      // Title: first heading or strong text in the card
      const title = (
        card.querySelector('a[href*="jobs"] strong') ||
        card.querySelector('strong') ||
        card.querySelector('a[href*="jobs"]')
      )?.innerText?.trim();

      if (!title || title.length < 2) continue;

      // Company: look for subtitle text (usually second distinct text)
      const texts = Array.from(card.querySelectorAll('span,div,a'))
        .filter(el => el.childElementCount === 0)
        .map(el => el.innerText?.trim())
        .filter(t => t && t.length > 1 && t !== title && !/^\d/.test(t) && t.length < 100);

      const company = texts[0] || null;

      console.log(`[ColdReach] job: "${title}" at "${company}" → ${job_url}`);
      window.ColdReach.sendJob({ title, company, job_url });

      // If we have a company, queue it for recruiter lookup via companion
      if (company) {
        queueCompanyForRecruiterLookup(company);
      }

      saved++;
    }
    return saved;
  }

  // Batch companies to send to companion for automated recruiter finding
  const pendingCompanies = new Set();
  let flushTimer = null;

  function queueCompanyForRecruiterLookup(company) {
    pendingCompanies.add(company);
    clearTimeout(flushTimer);
    // Flush after 2s of no new companies (debounce)
    flushTimer = setTimeout(flushCompaniesToCompanion, 2000);
  }

  async function flushCompaniesToCompanion() {
    if (!pendingCompanies.size) return;
    const companies = [...pendingCompanies];
    pendingCompanies.clear();

    const { 'companion-url': companionUrl = 'http://localhost:3333' } =
      await chrome.storage.local.get('companion-url');

    try {
      const res = await fetch(`${companionUrl}/find-recruiters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies }),
      });
      if (res.ok) {
        const json = await res.json();
        console.log(`[ColdReach] companion found ${json.total} recruiters for ${companies.length} companies`);
      }
    } catch {
      // Companion not running — skip silently
    }
  }

  function scrapeDetailPanel() {
    // Hiring team in detail panel — look for /in/ links near "hiring" context
    const bodyText = document.body.innerText.toLowerCase();
    if (!bodyText.includes('hiring team') && !bodyText.includes('meet the')) return 0;

    const profileLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    let saved = 0;

    for (const link of profileLinks) {
      const linkedin_url = link.href.split('?')[0];
      if (!linkedin_url.includes('/in/')) continue;

      const img = link.querySelector('img');
      const name = img?.alt?.trim() || link.getAttribute('aria-label')?.trim() || link.innerText?.trim();
      if (!name || name.length < 2 || name.includes('LinkedIn')) continue;

      const card = link.closest('li') || link.parentElement;
      const title = Array.from(card?.querySelectorAll('span,div') || [])
        .find(el => el.childElementCount === 0 && el.innerText?.trim() && el.innerText.trim() !== name)
        ?.innerText?.trim() || null;

      const company = document.querySelector('a[href*="/company/"]')?.innerText?.trim() || null;

      console.log(`[ColdReach] recruiter: "${name}" (${title}) at "${company}"`);
      window.ColdReach.sendContact({ name, title, company, linkedin_url, source: 'linkedin-jobs-hiring-team' });
      saved++;
    }
    return saved;
  }

  function run() {
    const jobs = scrapeJobCards();
    const recruiters = scrapeDetailPanel();
    if (jobs || recruiters) {
      console.log(`[ColdReach] scraped ${jobs} new jobs, ${recruiters} recruiters`);
    }
  }

  setTimeout(run, 3000);

  // Re-run when selected job changes
  let lastJobId = null;
  new MutationObserver(() => {
    const params = new URLSearchParams(location.search);
    const jobId = params.get('currentJobId');
    if (jobId && jobId !== lastJobId) {
      lastJobId = jobId;
      setTimeout(run, 1500);
    }
  }).observe(document.body, { childList: true, subtree: false });

})();
