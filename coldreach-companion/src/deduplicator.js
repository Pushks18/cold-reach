const { getSupabase } = require('./supabase-client');

function isDuplicate(contact, existing) {
  return existing.some(e =>
    (contact.email && e.email === contact.email) ||
    (contact.linkedin_url && e.linkedin_url === contact.linkedin_url)
  );
}

function buildUpsertPayload(contact) {
  return Object.fromEntries(
    Object.entries(contact).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

async function upsertContact(contact, companyId) {
  const supabase = getSupabase();
  const payload = buildUpsertPayload({ ...contact, company_id: companyId });
  const { data, error } = await supabase
    .from('contacts')
    .upsert(payload, { onConflict: 'linkedin_url', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw new Error(`upsert contact failed: ${error.message}`);
  return data;
}

async function upsertCompany(name, domain) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('companies')
    .upsert({ name, domain }, { onConflict: 'domain', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw new Error(`upsert company failed: ${error.message}`);
  return data;
}

async function logScrapeEvent(source, url, contactsFound) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('scrape_events')
    .insert({ source, url, contacts_found: contactsFound });
  if (error) console.warn('[deduplicator] scrape event log failed:', error.message);
}

module.exports = { isDuplicate, buildUpsertPayload, upsertContact, upsertCompany, logScrapeEvent };
