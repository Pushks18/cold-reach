const { newPage } = require('./scraper');

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

async function searchEmails(name, domain, profilePath) {
  const query = `"${name}" "${domain}" email`;
  const page = await newPage(profilePath);
  try {
    await page.goto(
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    );
    const text = await page.innerText('body');
    const matches = text.match(EMAIL_RE) || [];
    // Only return emails on the target domain
    return [...new Set(matches.filter(e => e.toLowerCase().endsWith(`@${domain.toLowerCase()}`)))];
  } catch (err) {
    console.warn(`[google-scraper] searchEmails failed for ${name}@${domain}:`, err.message);
    return [];
  } finally {
    await page.close();
  }
}

async function scrapeUrl(url, profilePath) {
  const page = await newPage(profilePath);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const text = await page.innerText('body');
    const matches = text.match(EMAIL_RE) || [];
    return [...new Set(matches)];
  } catch (err) {
    console.warn(`[google-scraper] scrapeUrl failed for ${url}:`, err.message);
    return [];
  } finally {
    await page.close();
  }
}

module.exports = { searchEmails, scrapeUrl };
