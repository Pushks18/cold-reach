// Supabase JS v2 — bundled locally (MV3 CSP blocks external CDN imports)
import { createClient } from '../lib/supabase.js';

let _client = null;

async function getSupabase() {
  if (_client) return _client;
  const stored = await chrome.storage.local.get(['supabase-url', 'supabase-key']);
  console.log('[supabase-client] stored keys:', Object.keys(stored), 'url length:', stored['supabase-url']?.length, 'key length:', stored['supabase-key']?.length);
  const url = stored['supabase-url'];
  const key = stored['supabase-key'];
  if (!url || !key) throw new Error('Supabase credentials not configured. Open Settings.');
  _client = createClient(url, key);
  return _client;
}

// Reset client when settings change so new credentials take effect
chrome.storage.onChanged.addListener(() => { _client = null; });

export { getSupabase };
