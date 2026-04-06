const { getSupabase } = require('./supabase-client');

async function upsertJob(job) {
  // job shape: { title, company, location, job_url, description, posted_at, apply_method, salary_range }
  const supabase = getSupabase();

  const payload = Object.fromEntries(
    Object.entries(job).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

  // Use ignoreDuplicates: true — if the job_url already exists, Supabase skips and returns no data.
  // If data has a row, it's new.
  const { data, error } = await supabase
    .from('jobs')
    .upsert(payload, { onConflict: 'job_url', ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) throw new Error(`upsert job failed: ${error.message}`);

  const isNew = data !== null;
  return { data, isNew };
}

async function getJobSearchCriteria() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('job_search_criteria')
    .select('*')
    .eq('active', true);
  if (error) throw new Error(`getJobSearchCriteria failed: ${error.message}`);
  return data || [];
}

async function updateCriteriaLastRun(criteriaId) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('job_search_criteria')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', criteriaId);
  if (error) throw new Error(`updateCriteriaLastRun failed: ${error.message}`);
}

module.exports = { upsertJob, getJobSearchCriteria, updateCriteriaLastRun };
