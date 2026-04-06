const { scrapeUrl } = require('./google-scraper');
const { upsertContact, upsertCompany, logScrapeEvent } = require('./deduplicator');
const { enrichContact } = require('./enrichment');

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

  let email = rawContact.email || null;
  let emailVerified = false;

  // Run full enrichment pipeline if no email yet
  if (!email && name) {
    const enriched = await enrichContact({
      name,
      company: company || domain,
      linkedinUrl: linkedin_url,
      profilePath,
    });
    if (enriched?.email) {
      email = enriched.email;
      // SMTP-verified emails come from verifyBatch inside enrichment
      emailVerified = false;
    }
  }

  // Scrape source URL directly if still no email
  if (!email && sourceUrl) {
    const found = await scrapeUrl(sourceUrl, profilePath);
    if (found.length) email = found[0];
  }

  // Upsert company
  let companyId = null;
  if (company || domain) {
    const savedCompany = await upsertCompany(company || domain, domain || null).catch(() => null);
    companyId = savedCompany?.id || null;
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
  async function run({ urls = [] }) {
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
