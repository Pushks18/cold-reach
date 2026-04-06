# ColdReach Database

Supabase PostgreSQL migrations for ColdReach.

## Schema

The database consists of 5 tables:

- **companies** — Unique on name and domain. Stores company metadata (industry, size, career page).
- **contacts** — Unique on linkedin_url. HR/recruiter contact info linked to companies.
- **jobs** — Job listings with status tracking (saved, applied, rejected, offer).
- **applications** — Links jobs to contacts, tracks cover letters and outcomes.
- **scrape_events** — Append-only analytics log of scraping runs.

## Running Migrations

1. Go to your Supabase project → **SQL Editor**
2. Open `/migrations/001_initial_schema.sql` and run it first
3. Open `/migrations/002_rls_policies.sql` and run it second
4. Copy your database credentials:
   - Go to Supabase → **Settings** → **API**
   - Copy `Project URL` and `anon public key`
   - Use these in your app configuration

## Row Level Security (RLS)

RLS is enabled on all tables with permissive policies. The anon key has full CRUD access (no filtering), making this suitable for a single-user personal tool.

If you later add authentication, replace the `create policy` statements with user-specific filters.

## Notes

- All IDs are UUIDs (auto-generated with `gen_random_uuid()`)
- All timestamps use `timestamptz` for timezone-aware storage
- Foreign keys reference primary tables but are not strictly enforced on delete (use `on delete cascade` if you want cascading deletes)
- The `job_status` enum is immutable once created; if you need to add new statuses, you'll need to create a new enum or alter the existing one
