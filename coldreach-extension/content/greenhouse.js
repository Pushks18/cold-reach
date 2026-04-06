(function() {
  setTimeout(function() {
    const jobTitle = document.querySelector('.app-title')?.innerText?.trim()
      || document.querySelector('h1')?.innerText?.trim();
    const company = document.querySelector('.company-name')?.innerText?.trim()
      || (document.title.includes(' at ') ? document.title.split(' at ').pop().trim() : null);
    const emails = window.ColdReach.extractEmails(document.body.innerText);

    if (jobTitle) window.ColdReach.sendJob({ title: jobTitle, company, job_url: window.location.href });
    if (emails[0]) window.ColdReach.sendContact({ email: emails[0], company, source: 'greenhouse' });
  }, 1500);
})();
