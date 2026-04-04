import { tryHunter, tryApollo, trySnov } from './api-fallback.js';
import { upsertContact, upsertCompany, logScrapeEvent } from './deduplicator.js';

async function getSettings() {
  return chrome.storage.local.get(['hunter-key', 'apollo-key', 'snov-key', 'companion-url']);
}

async function checkCompanion(companionUrl) {
  try {
    const res = await fetch(`${companionUrl}/status`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

async function getDomainForCompany(company) {
  if (!company) return null;
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company)}`
    );
    const json = await res.json();
    return json[0]?.domain || null;
  } catch { return null; }
}

export async function processContact(rawContact, pageUrl) {
  const settings = await getSettings();
  const { name, title, location, linkedin_url, phone, company, source } = rawContact;
  let email = rawContact.email || null;

  const domain = await getDomainForCompany(company);

  // Try companion (SMTP verify) if no email
  if (!email && name && domain) {
    const companionUrl = settings['companion-url'] || 'http://localhost:3333';
    if (await checkCompanion(companionUrl)) {
      try {
        const res = await fetch(`${companionUrl}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companies: [{ name, domain }] }),
        });
        const json = await res.json();
        email = json.results?.[0]?.email || null;
      } catch { /* companion unavailable */ }
    }
  }

  // API fallbacks if still no email
  if (!email && name && domain) {
    email = await tryHunter(name, domain, settings['hunter-key'])
          || await tryApollo(name, domain, settings['apollo-key'])
          || await trySnov(name, domain, settings['snov-key'])
          || null;
  }

  // Upsert company
  let companyId = null;
  if (company && domain) {
    const saved = await upsertCompany(company, domain);
    companyId = saved?.id || null;
  }

  // Upsert contact
  const saved = await upsertContact({ name, email, title, location, linkedin_url, phone, source }, companyId);
  await logScrapeEvent(source || 'unknown', pageUrl, 1);
  return saved;
}

export async function processJob(rawJob) {
  const { getSupabase } = await import('./supabase-client.js');
  const supabase = await getSupabase();
  const { title, company, location, job_url } = rawJob;

  let companyId = null;
  if (company) {
    const { data } = await supabase
      .from('companies')
      .upsert({ name: company }, { onConflict: 'name', ignoreDuplicates: true })
      .select()
      .single();
    companyId = data?.id || null;
  }

  await supabase
    .from('jobs')
    .upsert({ title, company_id: companyId, job_url, status: 'saved' }, { onConflict: 'job_url', ignoreDuplicates: true });
}
