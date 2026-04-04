-- Companies
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain text unique,
  career_page_url text,
  industry text,
  size text,
  created_at timestamptz default now()
);

-- Contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  email_verified bool default false,
  phone text,
  location text,
  linkedin_url text unique,
  title text,
  company_id uuid references companies(id) on delete set null,
  source text not null,
  created_at timestamptz default now()
);

-- Jobs
do $$ begin
  create type job_status as enum ('saved', 'applied', 'rejected', 'offer');
exception
  when duplicate_object then null;
end $$;

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_id uuid references companies(id) on delete set null,
  job_url text,
  description text,
  posted_at timestamptz,
  status job_status default 'saved',
  created_at timestamptz default now()
);

-- Applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  cover_letter text,
  sent_at timestamptz,
  response_at timestamptz,
  outcome text,
  created_at timestamptz default now()
);

-- Scrape events (analytics)
create table if not exists scrape_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  url text,
  contacts_found int default 0,
  timestamp timestamptz default now()
);

-- Indexes for common join queries
create index if not exists contacts_company_id_idx on contacts(company_id);
create index if not exists jobs_company_id_idx on jobs(company_id);
create index if not exists applications_job_id_idx on applications(job_id);
create index if not exists applications_contact_id_idx on applications(contact_id);

-- Partial unique index on email (allows multiple NULLs but no duplicate non-null emails)
create unique index if not exists contacts_email_unique on contacts(email) where email is not null;
