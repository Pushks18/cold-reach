(function() {
  setTimeout(function() {
    const jobTitle = document.querySelector('.posting-headline h2')?.innerText?.trim()
      || document.querySelector('h2')?.innerText?.trim();
    const company = document.querySelector('.main-header-logo img')?.getAttribute('alt')
      || (document.title.includes(' - ') ? document.title.split(' - ').pop().trim() : null);
    const emails = window.ColdReach.extractEmails(document.body.innerText);

    if (jobTitle) window.ColdReach.sendJob({ title: jobTitle, company, job_url: window.location.href });
    if (emails[0]) window.ColdReach.sendContact({ email: emails[0], company, source: 'lever' });
  }, 1500);
})();
