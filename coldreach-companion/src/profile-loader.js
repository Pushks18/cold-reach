// Loads user profile from profile.json (exported from job app autofiller)
// Also extracts embedded resume PDF to resumes/ folder

const fs = require('fs');
const path = require('path');

const PROFILE_PATH = path.join(__dirname, '../profile.json');
const RESUMES_DIR = path.join(__dirname, '../resumes');

let _profile = null;

function loadProfile() {
  if (_profile) return _profile;
  if (!fs.existsSync(PROFILE_PATH)) return null;

  const raw = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'));

  _profile = {
    full_name: `${raw.nameData?.firstName || ''} ${raw.nameData?.lastName || ''}`.trim(),
    email: raw.contactData?.email || '',
    phone: raw.contactData?.phoneNumber || '',
    location: `${raw.addressData?.city || ''}, ${raw.addressData?.state || ''}`.replace(/^, |, $/g, ''),
    address: `${raw.addressData?.line1 || ''}, ${raw.addressData?.city || ''}, ${raw.addressData?.state || ''} ${raw.addressData?.postalCode || ''}`.trim(),
    linkedin_url: raw.websiteData?.linkedin || '',
    github_url: raw.websiteData?.github || '',
    website_url: raw.websiteData?.personal || '',
    skills: raw.skillsData || [],
    jobs: (raw.jobData || []).map(j => ({
      title: j.jobTitle,
      company: j.company,
      location: j.location,
      startDate: j.startDate,
      endDate: j.currentlyWorkHere ? 'Present' : j.endDate,
      description: j.description,
    })),
    education: (raw.educationData || []).map(e => ({
      school: e.school,
      degree: e.degree,
      field: e.fieldOfStudy,
      gpa: e.gpa,
      startDate: e.startDate,
      endDate: e.endDate,
    })),
    languages: (raw.languageData || []).map(l => l.language),
    // Employment eligibility
    eligibilityUS: raw.employmentData?.eligibilityUS ?? true,
    sponsorship: raw.employmentData?.sponsorship ?? false,
    disability: raw.employmentData?.disability ?? false,
    veteran: raw.employmentData?.veteran ?? false,
    gender: raw.employmentData?.gender || '',
    ethnicity: raw.employmentData?.ethnicity || '',
  };

  // Extract embedded resume PDF
  if (raw.resumeData?.resumeBase64) {
    if (!fs.existsSync(RESUMES_DIR)) fs.mkdirSync(RESUMES_DIR, { recursive: true });
    const fileName = raw.resumeData.fileName || 'general.pdf';
    const pdfPath = path.join(RESUMES_DIR, fileName);
    if (!fs.existsSync(pdfPath)) {
      const buffer = Buffer.from(raw.resumeData.resumeBase64, 'base64');
      fs.writeFileSync(pdfPath, buffer);
      console.log(`[profile] extracted resume: ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)`);
    }
    // Also save as general.pdf fallback
    const generalPath = path.join(RESUMES_DIR, 'general.pdf');
    if (!fs.existsSync(generalPath)) {
      fs.copyFileSync(pdfPath, generalPath);
    }
  }

  console.log(`[profile] loaded: ${_profile.full_name} (${_profile.email})`);
  return _profile;
}

// Generate resume text summary for LLM context
function getResumeText() {
  const p = loadProfile();
  if (!p) return '';

  const lines = [];
  lines.push(`Name: ${p.full_name}`);
  lines.push(`Location: ${p.location}`);
  lines.push(`Email: ${p.email}`);
  lines.push(`Skills: ${p.skills.join(', ')}`);
  lines.push('');

  for (const job of p.jobs) {
    lines.push(`${job.title} @ ${job.company} (${job.startDate} - ${job.endDate})`);
    lines.push(job.description);
    lines.push('');
  }

  for (const edu of p.education) {
    lines.push(`${edu.degree} in ${edu.field}, ${edu.school} (GPA: ${edu.gpa})`);
  }

  return lines.join('\n');
}

module.exports = { loadProfile, getResumeText };
