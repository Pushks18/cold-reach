(function() {
  setTimeout(function() {
    const jobTitle = document.querySelector('.job-details-jobs-unified-top-card__job-title h1')?.innerText?.trim()
      || document.querySelector('h1')?.innerText?.trim();
    const company = document.querySelector('.job-details-jobs-unified-top-card__company-name a')?.innerText?.trim();
    const location = document.querySelector('.job-details-jobs-unified-top-card__primary-description-without-tagline')?.innerText?.trim();

    // Recruiter card on job listings
    const recruiterName = document.querySelector('.hirer-card__hirer-information .hoverable-link-text')?.innerText?.trim();
    const recruiterTitle = document.querySelector('.hirer-card__hirer-information .body-small')?.innerText?.trim();

    if (jobTitle) {
      window.ColdReach.sendJob({ title: jobTitle, company, location, job_url: window.location.href });
    }

    if (recruiterName) {
      window.ColdReach.sendContact({
        name: recruiterName,
        title: recruiterTitle,
        company,
        source: 'linkedin-jobs',
      });
    }
  }, 2500);
})();
