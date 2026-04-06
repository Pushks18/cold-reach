-- Phase: Auto-Apply Expansion
-- Run after 001_initial_schema.sql and 002_rls_policies.sql

-- Extend jobs table with fields needed for scraping and auto-apply
alter table jobs
  add column if not exists location text,
  add column if not exists salary_range text,
  add column if not exists job_type text,
  add column if not exists apply_method text,   -- 'linkedin-easy-apply' | 'greenhouse' | 'lever' | 'workday' | 'external'
  add column if not exists description text,
  add column if not exists applied_at timestamptz;

-- User job search profile (single-row for personal tool)
create table if not exists user_profile (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  location text,
  linkedin_url text,
  resume_text text,
  resume_pdf_url text,
  skills text[],
  preferred_roles text[],
  preferred_locations text[],
  min_salary int,
  job_types text[],   -- 'full-time', 'part-time', 'contract', 'internship'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Job search criteria (multiple saved searches)
create table if not exists job_search_criteria (
  id uuid primary key default gen_random_uuid(),
  label text,
  keywords text not null,
  location text,
  platforms text[] default '{"linkedin","indeed","glassdoor"}',
  active bool default true,
  last_run_at timestamptz,
  created_at timestamptz default now()
);

-- RLS: allow anon full access (same as other tables)
alter table user_profile enable row level security;
alter table job_search_criteria enable row level security;

create policy "anon full access user_profile" on user_profile for all using (true) with check (true);
create policy "anon full access job_search_criteria" on job_search_criteria for all using (true) with check (true);

-- Indexes
create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_apply_method_idx on jobs(apply_method);
