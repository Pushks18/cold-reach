# ColdReach

Automatically find recruiter and HR contact info as you browse job pages.

## Project Structure

```
coldreach-extension/   Chrome MV3 extension
coldreach-companion/   Local Node.js Playwright companion (optional but recommended)
coldreach-db/          Supabase SQL migration files
```

## Quick Start

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open SQL Editor and run `coldreach-db/migrations/001_initial_schema.sql`
3. Then run `coldreach-db/migrations/002_rls_policies.sql`
4. Copy your Project URL and Anon Key from Settings → API

### 2. Load the Chrome Extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `coldreach-extension/` folder
4. Click the ColdReach icon → ⚙️ Settings → paste your Supabase URL and Anon Key → Save

### 3. Start the Playwright Companion (optional — enables SMTP email verification)

```bash
cd coldreach-companion
cp .env.example .env
# Edit .env with your SUPABASE_URL and SUPABASE_SERVICE_KEY
npm install
npm start
```

The extension popup will show a green dot when the companion is running.

### 4. Browse job pages

Visit LinkedIn profiles, LinkedIn jobs, Greenhouse, Lever, or Workday pages. ColdReach silently collects recruiter info in the background. Click the extension icon to see recent contacts, or open Analytics for the full dashboard.

## Manual Scraping

Click the extension icon → "Scrape Current Page" to force-scrape whatever page you're on.

## Scheduled Bulk Scraping

Add URLs to `coldreach-companion/watchlist.json` and the companion will scrape them on the configured interval (`SCHEDULER_INTERVAL_MINUTES` in `.env`, default: every 2 hours).

## Tech Stack

| Layer | Tech |
|---|---|
| Extension | Chrome MV3, vanilla JS |
| Companion | Node.js, Playwright, Express, node-cron |
| Database | Supabase (PostgreSQL, free tier) |
| Email verification | SMTP handshake via companion |
| API fallbacks | Hunter.io / Apollo.io / Snov.io (free tiers, optional) |

## Future Scope

- AI cover letter generation (OpenAI)
- Auto email recruiters
- Auto-apply to jobs via Playwright
