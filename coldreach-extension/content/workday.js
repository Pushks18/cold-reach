(function() {
  setTimeout(function() {
    const jobTitle = document.querySelector('[data-automation-id="jobPostingHeader"]')?.innerText?.trim()
      || document.querySelector('h2')?.innerText?.trim();
    const company = document.querySelector('[data-automation-id="jobPostingCompanyName"]')?.innerText?.trim();
    const emails = window.ColdReach.extractEmails(document.body.innerText);

    if (jobTitle) window.ColdReach.sendJob({ title: jobTitle, company, job_url: window.location.href });
    if (emails[0]) window.ColdReach.sendContact({ email: emails[0], company, source: 'workday' });
  }, 2000);
})();
