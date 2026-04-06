-- Enable RLS on all tables
alter table companies enable row level security;
alter table contacts enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table scrape_events enable row level security;

-- Allow anon key full access (single-user tool, no auth required for MVP)
create policy "anon_all_companies" on companies for all using (true) with check (true);
create policy "anon_all_contacts" on contacts for all using (true) with check (true);
create policy "anon_all_jobs" on jobs for all using (true) with check (true);
create policy "anon_all_applications" on applications for all using (true) with check (true);
create policy "anon_all_scrape_events" on scrape_events for all using (true) with check (true);
