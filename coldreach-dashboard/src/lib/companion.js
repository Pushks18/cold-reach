const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  return res.json()
}

export const companion = {
  status: () => request('/status'),
  runPipeline: (opts = {}) => request('/run-pipeline', { method: 'POST', body: JSON.stringify(opts) }),
  recruiterPipeline: (opts = {}) => request('/recruiter-pipeline', { method: 'POST', body: JSON.stringify(opts) }),
  findRecruiters: (companies) => request('/find-recruiters', { method: 'POST', body: JSON.stringify({ companies }) }),
  autoApplyAll: (opts = {}) => request('/auto-apply-all', { method: 'POST', body: JSON.stringify(opts) }),
  apply: (jobId, dryRun = true) => request('/apply', { method: 'POST', body: JSON.stringify({ job_id: jobId, dry_run: dryRun }) }),
  getJobs: (params = {}) => request(`/jobs?${new URLSearchParams(params)}`),
  getProfile: () => request('/profile'),
  updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getResumes: () => request('/resumes'),
}
