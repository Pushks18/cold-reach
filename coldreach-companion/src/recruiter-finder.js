// Finds HR/recruiting contacts for companies via LinkedIn People Search
// Uses TEXT-BASED parsing (not DOM selectors) for maximum reliability

const { newPage } = require('./scraper');
const { enrichContact } = require('./enrichment');
const { upsertContact, upsertCompany, logScrapeEvent } = require('./deduplicator');

const RECRUITER_KEYWORDS = [
  'recruiter', 'recruiting', 'talent acquisition', 'talent partner',
  'talent operations', 'hr ', 'h.r.', 'human resources', 'people ops',
  'people operations', 'people and talent', 'university recruiter',
  'technical recruiter', 'campus recruiter', 'staffing', 'hiring',
  'hr coordinator', 'hr assistant', 'hr manager', 'hr director',
  'head of talent', 'head of people', 'head of hr', 'vp of people',
  'vp of hr', 'chief people officer',
];

function isRecruiter(title) {
  if (!title) return false;
  const t = title.toLowerCase();
  return RECRUITER_KEYWORDS.some(k => t.includes(k));
}

// Parse LinkedIn People Search results from raw page text
// Uses the "• 1st|2nd|3rd+" connection degree markers as anchors
function parseSearchResults(pageText) {
  const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
  const people = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match lines containing connection degree markers
    const degreeMatch = line.match(/^(.+?)\s*[•·]\s*(1st|2nd|3rd\+?)$/);
    if (!degreeMatch) continue;

    const name = degreeMatch[1].replace(/\s+/g, ' ').trim();

    // Skip noise
    if (!name || name.length < 3 || name.length > 60) continue;
    if (name === 'LinkedIn Member') continue;
    if (/^(People|Actively|All filters|Locations|Current)/.test(name)) continue;

    // Next non-empty line after name is title
    const title = lines[i + 1] || null;
    // Line after that is location
    const location = lines[i + 2] || null;

    // Clean title — remove "is hiring" suffix from name if present
    let cleanName = name.replace(/\s+is hiring$/, '').trim();

    people.push({
      name: cleanName,
      title: title && title.length < 150 ? title : null,
      location: location && location.length < 100 && !['Message', 'Connect', 'Follow', 'Pending'].includes(location) ? location : null,
    });
  }

  return people;
}

// Extract LinkedIn profile URLs from the page via DOM (just the URLs, not text)
async function extractProfileUrls(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    const urls = new Map();
    for (const link of links) {
      const href = link.href?.split('?')[0];
      if (!href || !href.includes('/in/') || href.endsWith('/in/')) continue;
      if (href.includes('/search/')) continue;
      // Get any name text near this link
      const name = link.innerText?.trim() ||
                   link.querySelector('span')?.innerText?.trim() ||
                   link.querySelector('img')?.alt?.trim();
      if (name && name.length > 2 && !urls.has(href)) {
        urls.set(href, name);
      }
    }
    return [...urls.entries()]; // [[url, name], ...]
  });
}

async function searchLinkedInPeople(page, query) {
  const url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
  console.log(`[recruiter-finder] GET ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  // Wait for page to render
  await new Promise(r => setTimeout(r, 3000));

  // Scroll down to load more results
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await new Promise(r => setTimeout(r, 600));
  }

  // Get page text and parse people from it
  const pageText = await page.innerText('body').catch(() => '');
  const textPeople = parseSearchResults(pageText);

  // Also get profile URLs from DOM
  const urlPairs = await extractProfileUrls(page);

  // Match text-parsed people with their LinkedIn URLs
  const people = textPeople.map(person => {
    // Find matching URL by name
    const match = urlPairs.find(([, urlName]) => {
      const a = person.name.toLowerCase();
      const b = (urlName || '').toLowerCase();
      return a.includes(b) || b.includes(a) || a === b;
    });
    return {
      ...person,
      linkedin_url: match ? match[0] : null,
    };
  });

  // Deduplicate by name
  const seen = new Set();
  return people.filter(p => {
    const key = p.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function findRecruitersForCompany(companyName, profilePath) {
  const page = await newPage(profilePath);
  const saved = [];

  try {
    // Search 1: "Company" recruiter
    const query1 = `"${companyName}" recruiter`;
    const people1 = await searchLinkedInPeople(page, query1);

    // Search 2: "Company" "talent acquisition"
    const query2 = `"${companyName}" "talent acquisition"`;
    const people2 = await searchLinkedInPeople(page, query2);

    // Search 3: "Company" HR
    const query3 = `"${companyName}" HR hiring`;
    const people3 = await searchLinkedInPeople(page, query3);

    // Merge + deduplicate
    const seen = new Set();
    const allPeople = [...people1, ...people2, ...people3].filter(p => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[recruiter-finder] ${companyName}: found ${allPeople.length} candidates`);
    allPeople.forEach(p => console.log(`  - ${p.name} | ${p.title} | ${p.linkedin_url || 'no URL'}`));

    // Filter to HR/recruiting roles
    const recruiters = allPeople.filter(p => isRecruiter(p.title));
    console.log(`[recruiter-finder] ${companyName}: ${recruiters.length} match recruiter/HR filter`);

    // Save company
    const savedCompany = await upsertCompany(companyName, null).catch(() => null);
    const companyId = savedCompany?.id || null;

    // Enrich and save each recruiter
    for (const person of recruiters.slice(0, 10)) {
      try {
        const enriched = await enrichContact({
          name: person.name,
          company: companyName,
          linkedinUrl: person.linkedin_url,
          profilePath,
        });

        await upsertContact({
          name: person.name,
          title: person.title,
          location: person.location,
          linkedin_url: person.linkedin_url,
          email: enriched?.email || null,
          source: 'linkedin-company-search',
        }, companyId);

        console.log(`[recruiter-finder] ✓ ${person.name} (${person.title}) email=${enriched?.email || 'none'}`);
        saved.push({ ...person, email: enriched?.email });
      } catch (err) {
        console.warn(`[recruiter-finder] save failed for ${person.name}:`, err.message);
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    await logScrapeEvent('recruiter-finder', `linkedin-search:${companyName}`, saved.length);

  } catch (err) {
    console.error(`[recruiter-finder] failed for ${companyName}:`, err.message);
  } finally {
    await page.close().catch(() => {});
  }

  return saved;
}

async function findRecruitersForCompanies(companies, profilePath) {
  const summary = [];
  for (const company of companies) {
    console.log(`\n[recruiter-finder] ══ Processing: ${company} ══`);
    const found = await findRecruitersForCompany(company, profilePath);
    summary.push({ company, found: found.length });
    await new Promise(r => setTimeout(r, 3000));
  }
  const total = summary.reduce((s, r) => s + r.found, 0);
  console.log(`\n[recruiter-finder] Total: ${total} recruiters saved across ${companies.length} companies`);
  return summary;
}

module.exports = { findRecruitersForCompanies, parseSearchResults };
