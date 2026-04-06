const TEXT_KEYS = ['supabase-url', 'supabase-key', 'companion-url', 'hunter-key', 'apollo-key', 'snov-key'];
const TOGGLE_KEYS = ['auto-mode', 'notify'];

async function loadSettings() {
  const stored = await chrome.storage.local.get([...TEXT_KEYS, ...TOGGLE_KEYS]);
  TEXT_KEYS.forEach(k => { const el = document.getElementById(k); if (el && stored[k] !== undefined) el.value = stored[k]; });
  TOGGLE_KEYS.forEach(k => { const el = document.getElementById(k); if (el && stored[k] !== undefined) el.checked = stored[k]; });
}

async function saveSettings() {
  const data = {};
  TEXT_KEYS.forEach(k => { data[k] = document.getElementById(k)?.value || ''; });
  TOGGLE_KEYS.forEach(k => { data[k] = document.getElementById(k)?.checked ?? true; });
  await chrome.storage.local.set(data);
  const msg = document.getElementById('status-msg');
  msg.textContent = 'Saved!';
  setTimeout(() => { msg.textContent = ''; }, 2000);
}

document.getElementById('save-btn').addEventListener('click', saveSettings);
loadSettings();
