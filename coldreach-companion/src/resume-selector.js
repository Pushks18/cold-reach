// Selects the best resume PDF from resumes/ folder based on job title

const fs = require('fs');
const path = require('path');

const RESUMES_DIR = path.join(__dirname, '../resumes');

const ROLE_MAP = [
  { keywords: ['machine learning', 'ml ', 'ai ', 'artificial intelligence', 'deep learning', 'nlp', 'computer vision'], file: 'ml.pdf' },
  { keywords: ['data science', 'data scientist', 'data analyst', 'analytics'], file: 'data-science.pdf' },
  { keywords: ['data engineer', 'data pipeline', 'etl', 'spark', 'airflow'], file: 'data-engineering.pdf' },
  { keywords: ['product manag', 'program manag', 'pm '], file: 'pm.pdf' },
  { keywords: ['frontend', 'front-end', 'react', 'angular', 'vue', 'ui ', 'ux '], file: 'frontend.pdf' },
  { keywords: ['backend', 'back-end', 'server', 'api '], file: 'backend.pdf' },
  { keywords: ['devops', 'cloud', 'infrastructure', 'sre', 'platform'], file: 'devops.pdf' },
  { keywords: ['software', 'swe', 'developer', 'engineer', 'fullstack', 'full-stack', 'intern'], file: 'swe.pdf' },
];

function selectResume(jobTitle) {
  const title = (jobTitle || '').toLowerCase();

  // Try role-specific resumes
  for (const { keywords, file } of ROLE_MAP) {
    if (keywords.some(k => title.includes(k))) {
      const fullPath = path.join(RESUMES_DIR, file);
      if (fs.existsSync(fullPath)) {
        console.log(`[resume] matched "${file}" for "${jobTitle}"`);
        return fullPath;
      }
    }
  }

  // Fallback: general.pdf
  const generalPath = path.join(RESUMES_DIR, 'general.pdf');
  if (fs.existsSync(generalPath)) {
    console.log(`[resume] using general.pdf for "${jobTitle}"`);
    return generalPath;
  }

  // Last resort: any PDF in the folder
  const files = fs.readdirSync(RESUMES_DIR).filter(f => f.endsWith('.pdf'));
  if (files.length) {
    const fallback = path.join(RESUMES_DIR, files[0]);
    console.log(`[resume] using fallback ${files[0]} for "${jobTitle}"`);
    return fallback;
  }

  console.warn('[resume] no resume PDFs found in resumes/ folder!');
  return null;
}

function listResumes() {
  if (!fs.existsSync(RESUMES_DIR)) return [];
  return fs.readdirSync(RESUMES_DIR).filter(f => f.endsWith('.pdf'));
}

module.exports = { selectResume, listResumes, RESUMES_DIR };
