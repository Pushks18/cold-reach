import { getRecentContacts } from '../background/deduplicator.js';

async function updateBadge() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_SESSION_COUNT' });
  document.getElementById('badge').textContent = `${res?.count ?? 0} found`;
}

async function checkCompanion() {
  const { 'companion-url': url = 'http://localhost:3333' } =
    await chrome.storage.local.get('companion-url');
  const dot = document.getElementById('companion-dot');
  const label = document.getElementById('companion-label');
  try {
    const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      dot.className = 'dot online';
      label.textContent = 'Companion running — SMTP enabled';
    } else throw new Error('not ok');
  } catch {
    dot.className = 'dot offline';
    label.textContent = 'Companion offline — SMTP disabled';
  }
}

async function loadContacts() {
  const contacts = await getRecentContacts(15);
  const list = document.getElementById('contacts-list');
  if (!contacts.length) return;
  list.innerHTML = contacts.map(c => `
    <div class="contact-item">
      <div class="contact-name">${c.name || '—'}</div>
      <div class="contact-meta">${[c.title, c.companies?.name].filter(Boolean).join(' · ') || '—'}</div>
      ${c.email ? `<div class="contact-email">${c.email}${c.email_verified ? ' <span class="verified">✓</span>' : ''}</div>` : ''}
    </div>
  `).join('');
}

document.getElementById('scrape-btn').addEventListener('click', async () => {
  const btn = document.getElementById('scrape-btn');
  btn.textContent = 'Scraping...';
  btn.disabled = true;
  await chrome.runtime.sendMessage({ type: 'MANUAL_SCRAPE' });
  setTimeout(async () => {
    await Promise.all([loadContacts(), updateBadge()]);
    btn.textContent = 'Scrape Current Page';
    btn.disabled = false;
  }, 3000);
});

updateBadge();
checkCompanion();
loadContacts();
