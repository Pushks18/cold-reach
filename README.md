# ColdReach

Autonomous job hunting platform that finds tech internships, discovers recruiters, finds their emails, and auto-applies to jobs — all while you sleep.

## What It Does

1. **Searches LinkedIn Jobs** — finds tech internships posted in the last 24 hours across 10 search categories
2. **Clicks into each job** — extracts full description, company info, salary, apply method
3. **Finds recruiters** — searches LinkedIn for HR/recruiting contacts at each company using text-based parsing
4. **Finds emails** — 9-method enrichment pipeline: Hunter.io, Apollo.io, Snov.io, People Data Labs, LinkedIn profile scrape, Google search (3 queries), GitHub profile, SMTP pattern verification (15 patterns)
5. **Auto-applies** — fills LinkedIn Easy Apply forms using your resume + local LLM (Ollama) for screening questions
6. **Dashboard** — React UI to monitor jobs, contacts, applications, and trigger pipelines

## Architecture

```
coldreach-dashboard/     React + Vite + Tailwind — analytics UI
coldreach-companion/     Node.js + Playwright + Express — automation engine
coldreach-db/            Supabase PostgreSQL migrations
docker/                  Docker Compose for cloud deployment
```

## Quick Start

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.com) (for answering application questions locally)
- A [Supabase](https://supabase.com) project (free tier)
- Chrome browser (Playwright uses your logged-in session)

### 1. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run migrations in SQL Editor (in order):
   ```
   coldreach-db/migrations/001_initial_schema.sql
   coldreach-db/migrations/002_rls_policies.sql
   coldreach-db/migrations/003_auto_apply.sql
   ```
3. Copy your Project URL and keys from Settings > API > Legacy tab

### 2. Set Up the Companion

```bash
cd coldreach-companion
cp .env.example .env
# Edit .env — add Supabase keys, Chrome profile path, API keys
npm install
```

### 3. Add Your Profile

Drop a `profile.json` in `coldreach-companion/` with your details (name, contact info, work history, skills, embedded resume). The companion loads it on startup and extracts the resume PDF automatically.

### 4. Add Resumes

Drop your resume PDFs in `coldreach-companion/resumes/`:
- `swe.pdf` — Software Engineering
- `ml.pdf` — Machine Learning
- `general.pdf` — Fallback

### 5. Install the LLM

```bash
ollama pull llama3.2:3b
```

### 6. Start Everything

```bash
# Terminal 1
ollama serve

# Terminal 2
cd coldreach-companion && npm start

# Terminal 3
cd coldreach-dashboard && npm install && npm run dev
```

Dashboard at `http://localhost:5173` — go to Settings, enter Supabase credentials, save.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Companion health check |
| `/run-pipeline` | POST | Full pipeline: jobs > companies > recruiters > emails |
| `/recruiter-pipeline` | POST | Recruiter finding only (pass `companies` array or auto-search) |
| `/find-recruiters` | POST | Find recruiters for specific companies |
| `/auto-apply-all` | POST | Apply to all saved Easy Apply jobs (`dry_run` default: true) |
| `/apply` | POST | Apply to a single job by `job_id` |
| `/jobs` | GET | List jobs (filter: `status`, `limit`) |
| `/profile` | GET/PUT | User profile |
| `/resumes` | GET | List available resume PDFs |
| `/scrape-jobs` | POST | Search job boards for listings |

## Automated Schedule

| Time | Action |
|------|--------|
| 8:00 AM | Search LinkedIn for new tech internships (last 24h) > find companies > find recruiters > find emails |
| 9:00 AM | Auto-apply to all saved Easy Apply jobs |
| 9:00 PM | Evening batch: search + apply again |

Set `AUTO_APPLY_LIVE=true` in `.env` to enable real submissions (default is dry-run with screenshots).

## Email Enrichment Pipeline

Tried in order, stops at first hit:

1. Hunter.io API
2. Apollo.io API
3. Snov.io API
4. People Data Labs API
5. LinkedIn profile visit (scrape contact info)
6. Google search (3 query variations)
7. GitHub profile search
8. SMTP pattern brute force (15 email patterns verified via MX handshake)

## Deployment (Docker)

```bash
cd docker
docker compose up -d --build
docker exec coldreach-ollama-1 ollama pull llama3.2:3b
```

Services: nginx (dashboard on port 80) + companion (port 3333) + ollama (port 11434).

Works on any Linux VM — tested on Oracle Cloud always-free ARM (4 CPU, 24GB RAM).

## Tech Stack

| Layer | Tech |
|-------|------|
| Dashboard | React, Vite, TailwindCSS, Recharts, Supabase JS |
| Companion | Node.js, Express, Playwright, node-cron |
| Database | Supabase (PostgreSQL) |
| LLM | Ollama (llama3.2:3b, local) |
| Email APIs | Hunter.io, Apollo.io, Snov.io, People Data Labs |
| Email Verify | SMTP RCPT-TO handshake |
| Deployment | Docker Compose, nginx |

## License

MIT
