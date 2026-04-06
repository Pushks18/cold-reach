// Maximum aggression email enrichment pipeline
// Tries EVERYTHING: APIs → LinkedIn profile → Google → GitHub → SMTP patterns

const { generatePatterns } = require('./email-patterns');
const { verifyBatch } = require('./smtp-verifier');
const { newPage } = require('./scraper');

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Filters out junk emails (images, common non-person addresses)
function isPersonalEmail(email) {
  const lower = email.toLowerCase();
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif')) return false;
  if (lower.startsWith('noreply') || lower.startsWith('info@') || lower.startsWith('support@')) return false;
  if (lower.startsWith('admin@') || lower.startsWith('contact@') || lower.startsWith('hello@')) return false;
  return true;
}

// ── API METHODS ──────────────────────────────────────────────────────────────

async function tryHunter(firstName, lastName, domain) {
  const key = process.env.HUNTER_API_KEY;
  if (!key || !domain) return null;
  try {
    const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${key}`;
    const res = await fetch(url);
    const json = await res.json();
    const email = json.data?.email;
    if (email) console.log(`  [enrichment] Hunter ✓ ${email}`);
    return email || null;
  } catch { return null; }
}

async function tryApollo(firstName, lastName, domain, linkedinUrl) {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return null;
  try {
    const body = { first_name: firstName, last_name: lastName };
    if (domain) body.domain = domain;
    if (linkedinUrl) body.linkedin_url = linkedinUrl;
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const email = json.person?.email;
    if (email) console.log(`  [enrichment] Apollo ✓ ${email}`);
    return email || null;
  } catch { return null; }
}

async function trySnov(firstName, lastName, domain) {
  const clientId = process.env.SNOV_CLIENT_ID;
  const clientSecret = process.env.SNOV_CLIENT_SECRET;
  if (!clientId || !clientSecret || !domain) return null;
  try {
    const tokenRes = await fetch('https://api.snov.io/v1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) return null;
    const res = await fetch('https://api.snov.io/v1/get-emails-from-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access_token}` },
      body: JSON.stringify({ firstName, lastName, domain }),
    });
    const json = await res.json();
    const email = json.data?.[0]?.email;
    if (email) console.log(`  [enrichment] Snov ✓ ${email}`);
    return email || null;
  } catch { return null; }
}

async function tryPDL(firstName, lastName, domain, linkedinUrl) {
  const key = process.env.PDLABS_API_KEY;
  if (!key) return null;
  try {
    const params = new URLSearchParams({ api_key: key });
    if (linkedinUrl) params.set('profile', linkedinUrl);
    else { params.set('first_name', firstName); params.set('last_name', lastName); if (domain) params.set('company', domain); }
    const res = await fetch(`https://api.peopledatalabs.com/v5/person/enrich?${params}`);
    const json = await res.json();
    const email = json.data?.work_email || json.data?.personal_emails?.[0];
    if (email) console.log(`  [enrichment] PDL ✓ ${email}`);
    return email || null;
  } catch { return null; }
}

// ── BROWSER SCRAPE METHODS ───────────────────────────────────────────────────

async function scrapeLinkedInProfile(linkedinUrl, profilePath) {
  if (!linkedinUrl) return null;
  const page = await newPage(profilePath);
  try {
    console.log(`  [enrichment] visiting LinkedIn profile: ${linkedinUrl}`);
    await page.goto(linkedinUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Try to click "Contact info" button to reveal email
    const contactBtn = page.locator('a[href*="contact-info"], [id*="contact-info"], button:has-text("Contact info")');
    if (await contactBtn.count() > 0) {
      await contactBtn.first().click().catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
    }

    // Extract emails from the entire page text
    const text = await page.innerText('body').catch(() => '');
    const emails = (text.match(EMAIL_RE) || []).filter(isPersonalEmail);
    if (emails.length) {
      console.log(`  [enrichment] LinkedIn profile ✓ ${emails[0]}`);
      return emails[0];
    }
    return null;
  } catch (err) {
    console.warn(`  [enrichment] LinkedIn profile scrape failed: ${err.message}`);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeGoogle(firstName, lastName, company, domain, profilePath) {
  const page = await newPage(profilePath);
  try {
    // Multiple Google search queries for maximum coverage
    const queries = [
      `"${firstName} ${lastName}" "${company}" email`,
      `"${firstName} ${lastName}" "@${domain || company}" email`,
      `"${firstName} ${lastName}" ${company} contact`,
    ];

    for (const query of queries) {
      console.log(`  [enrichment] Google: ${query}`);
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
        waitUntil: 'domcontentloaded', timeout: 12000,
      });
      await new Promise(r => setTimeout(r, 1000));

      const text = await page.innerText('body').catch(() => '');
      const emails = (text.match(EMAIL_RE) || [])
        .filter(isPersonalEmail)
        .filter(e => {
          const lower = e.toLowerCase();
          // Prefer emails matching the domain or containing the person's name
          return (domain && lower.endsWith(`@${domain}`)) ||
                 lower.includes(firstName.toLowerCase()) ||
                 lower.includes(lastName.toLowerCase());
        });

      if (emails.length) {
        console.log(`  [enrichment] Google ✓ ${emails[0]}`);
        await page.close().catch(() => {});
        return emails[0];
      }

      await new Promise(r => setTimeout(r, 800));
    }

    return null;
  } catch (err) {
    console.warn(`  [enrichment] Google scrape failed: ${err.message}`);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeGitHub(firstName, lastName, profilePath) {
  const page = await newPage(profilePath);
  try {
    const query = `${firstName} ${lastName}`;
    console.log(`  [enrichment] GitHub: searching "${query}"`);
    await page.goto(`https://github.com/search?q=${encodeURIComponent(query)}&type=users`, {
      waitUntil: 'domcontentloaded', timeout: 12000,
    });
    await new Promise(r => setTimeout(r, 1500));

    // Click first user result
    const userLink = page.locator('.user-list-info a, [data-hovercard-type="user"]').first();
    if (await userLink.count() > 0) {
      const href = await userLink.getAttribute('href');
      if (href) {
        await page.goto(`https://github.com${href.startsWith('/') ? href : '/' + href}`, {
          waitUntil: 'domcontentloaded', timeout: 10000,
        });
        await new Promise(r => setTimeout(r, 1000));

        // GitHub profile often shows email in bio or sidebar
        const text = await page.innerText('body').catch(() => '');
        const emails = (text.match(EMAIL_RE) || []).filter(isPersonalEmail);
        if (emails.length) {
          console.log(`  [enrichment] GitHub ✓ ${emails[0]}`);
          return emails[0];
        }
      }
    }
    return null;
  } catch (err) {
    console.warn(`  [enrichment] GitHub scrape failed: ${err.message}`);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

// ── DOMAIN LOOKUP ────────────────────────────────────────────────────────────

async function getDomain(companyName) {
  if (!companyName) return null;
  try {
    const res = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`);
    const json = await res.json();
    return json[0]?.domain || null;
  } catch { return null; }
}

// ── MAIN ENRICHMENT ──────────────────────────────────────────────────────────

async function enrichContact({ name, company, linkedinUrl, profilePath }) {
  if (!name) return null;

  const parts = name.trim().split(' ');
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';

  const domain = await getDomain(company);

  console.log(`\n  [enrichment] ── ${name} @ ${company} (domain: ${domain}) ──`);

  let email = null;

  // ── ROUND 1: APIs (fast, no browser needed) ──

  if (!email) email = await tryHunter(firstName, lastName, domain);
  if (!email) email = await tryApollo(firstName, lastName, domain, linkedinUrl);
  if (!email) email = await trySnov(firstName, lastName, domain);
  if (!email) email = await tryPDL(firstName, lastName, domain, linkedinUrl);

  // ── ROUND 2: Browser scraping (slower, more coverage) ──

  if (!email && linkedinUrl && profilePath) {
    email = await scrapeLinkedInProfile(linkedinUrl, profilePath);
  }

  if (!email && profilePath) {
    email = await scrapeGoogle(firstName, lastName, company, domain, profilePath);
  }

  if (!email && profilePath) {
    email = await scrapeGitHub(firstName, lastName, profilePath);
  }

  // ── ROUND 3: SMTP brute force (last resort, no API/browser needed) ──

  if (!email && firstName && domain) {
    console.log(`  [enrichment] SMTP: trying ${generatePatterns(firstName, lastName, domain).length} patterns on ${domain}`);
    const patterns = generatePatterns(firstName, lastName, domain);
    const verified = await verifyBatch(patterns);
    email = verified[0] || null;
    if (email) console.log(`  [enrichment] SMTP ✓ ${email}`);
  }

  if (email) {
    console.log(`  [enrichment] ✓ FOUND: ${email}`);
  } else {
    console.log(`  [enrichment] ✗ no email found for ${name}`);
  }

  return { email, domain, firstName, lastName };
}

module.exports = { enrichContact, getDomain };
