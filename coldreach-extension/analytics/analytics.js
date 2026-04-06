import { getSupabase } from '../background/supabase-client.js';

async function loadStats() {
  const supabase = await getSupabase();
  const [contacts, verified, jobs, applied] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('email_verified', true),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
  ]);
  document.getElementById('total-contacts').textContent = contacts.count ?? '—';
  document.getElementById('verified-emails').textContent = verified.count ?? '—';
  document.getElementById('total-jobs').textContent = jobs.count ?? '—';
  document.getElementById('applied-jobs').textContent = applied.count ?? '—';
}

async function loadContacts() {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('contacts')
    .select('name, email, email_verified, title, companies(name), created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  const wrap = document.getElementById('contacts-table');
  if (!data?.length) { wrap.innerHTML = '<p class="empty">No contacts yet.</p>'; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Name</th><th>Email</th><th>Title</th><th>Company</th><th>Found</th></tr></thead>
    <tbody>${data.map(c => `<tr>
      <td>${c.name || '—'}</td>
      <td class="${c.email_verified ? 'email-verified' : ''}">${c.email || '—'}${c.email_verified ? ' ✓' : ''}</td>
      <td>${c.title || '—'}</td>
      <td>${c.companies?.name || '—'}</td>
      <td>${new Date(c.created_at).toLocaleDateString()}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

async function loadScrapeHistory() {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from('scrape_events')
    .select('source, url, contacts_found, timestamp')
    .order('timestamp', { ascending: false })
    .limit(20);
  const wrap = document.getElementById('scrape-history');
  if (!data?.length) { wrap.innerHTML = '<p class="empty">No scrape history yet.</p>'; return; }
  wrap.innerHTML = `<table>
    <thead><tr><th>Source</th><th>URL</th><th>Found</th><th>When</th></tr></thead>
    <tbody>${data.map(e => `<tr>
      <td>${e.source}</td>
      <td class="truncate">${e.url || '—'}</td>
      <td>${e.contacts_found}</td>
      <td>${new Date(e.timestamp).toLocaleString()}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

loadStats().catch(console.error);
loadContacts().catch(console.error);
loadScrapeHistory().catch(console.error);
