const { generatePatterns } = require('./email-patterns');
const { verifyBatch } = require('./smtp-verifier');
const { searchEmails, scrapeUrl } = require('./google-scraper');
const { upsertContact, upsertCompany, logScrapeEvent } = require('./deduplicator');

function extractNameParts(fullName) {
  const parts = (fullName || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

async function processContact(rawContact, { profilePath } = {}) {
  const {
    name, domain, title, location, linkedin_url, phone,
    company, source, sourceUrl,
  } = rawContact;

  const { first, last } = extractNameParts(name || '');
  let email = rawContact.email || null;
  let emailVerified = false;

  // Step 1: SMTP pattern generation + verification (if no email from DOM)
  if (!email && first && last && domain) {
    const patterns = generatePatterns(first, last, domain);
    const verified = await verifyBatch(patterns);
    if (verified.length) {
      email = verified[0];
      emailVerified = true;
    }
  }

  // Step 2: Google search (if still no email)
  if (!email && first && last && domain) {
    const found = await searchEmails(`${first} ${last}`, domain, profilePath);
    if (found.length) email = found[0];
  }

  // Step 3: Scrape source URL directly (if provided)
  if (!email && sourceUrl) {
    const found = await scrapeUrl(sourceUrl, profilePath);
    if (found.length) email = found[0];
  }

  // Upsert company
  let companyId = null;
  if (company && domain) {
    const saved = await upsertCompany(company, domain);
    companyId = saved?.id || null;
  }

  // Upsert contact
  const contact = await upsertContact({
    name,
    email,
    email_verified: emailVerified,
    phone,
    location,
    linkedin_url,
    title,
    source,
  }, companyId);

  return contact;
}

async function createPipeline({ profilePath } = {}) {
  async function run({ urls = [], companies = [] }) {
    const results = [];

    for (const url of urls) {
      const emails = await scrapeUrl(url, profilePath);
      for (const email of emails) {
        const contact = await upsertContact({ email, source: 'url-scrape' }, null);
        results.push(contact);
      }
      await logScrapeEvent('playwright-url', url, emails.length);
    }

    return results;
  }

  return { run, processContact: (contact, opts) => processContact(contact, { ...opts, profilePath }) };
}

module.exports = { createPipeline, extractNameParts, processContact };
