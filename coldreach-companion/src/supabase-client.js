const { createClient } = require('@supabase/supabase-js');

let client;

function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars required');
    client = createClient(url, key);
  }
  return client;
}

// Allow resetting in tests
function _resetClient() { client = null; }

module.exports = { getSupabase, _resetClient };
