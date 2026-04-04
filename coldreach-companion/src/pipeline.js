// STUB: replaced in Task 7 (Pipeline Orchestrator)
// run() will invoke: pattern gen → SMTP verify → Google scrape → public sources → API fallbacks → Supabase upsert

async function createPipeline({ profilePath } = {}) {
  async function run({ urls = [], companies = [] }) {
    console.warn('[pipeline] stub: run() called but pipeline is not implemented yet');
    return [];
  }
  return { run };
}

module.exports = { createPipeline };
