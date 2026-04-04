// Uses Supabase JS v2 ESM CDN — no build step required for MV3 service workers
let _client = null;

async function getSupabase() {
  if (_client) return _client;
  const { 'supabase-url': url, 'supabase-key': key } =
    await chrome.storage.local.get(['supabase-url', 'supabase-key']);
  if (!url || !key) throw new Error('Supabase credentials not configured. Open Settings.');
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  _client = createClient(url, key);
  return _client;
}

// Reset client when settings change so new credentials take effect
chrome.storage.onChanged.addListener(() => { _client = null; });

export { getSupabase };
