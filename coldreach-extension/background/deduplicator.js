import { getSupabase } from './supabase-client.js';

export async function upsertContact(contact, companyId) {
  const supabase = await getSupabase();
  const payload = Object.fromEntries(
    Object.entries({ ...contact, company_id: companyId })
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const { data, error } = await supabase
    .from('contacts')
    .upsert(payload, { onConflict: 'linkedin_url', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw new Error(`upsert contact failed: ${error.message}`);
  return data;
}

export async function upsertCompany(name, domain) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('companies')
    .upsert({ name, domain }, { onConflict: 'domain', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw new Error(`upsert company failed: ${error.message}`);
  return data;
}

export async function logScrapeEvent(source, url, contactsFound) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('scrape_events')
    .insert({ source, url, contacts_found: contactsFound });
  if (error) console.warn('[deduplicator] log failed:', error.message);
}

export async function getRecentContacts(limit = 20) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('contacts')
    .select('*, companies(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
