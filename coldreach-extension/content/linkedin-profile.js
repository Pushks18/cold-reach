(function() {
  // Wait for LinkedIn's React app to render the profile
  setTimeout(function() {
    const name = document.querySelector('h1')?.innerText?.trim();
    const title = document.querySelector('.text-body-medium.break-words')?.innerText?.trim();
    const location = document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText?.trim();
    const company = document.querySelector('.pv-text-details__right-panel .hoverable-link-text')?.innerText?.trim();
    const emails = window.ColdReach.extractEmails(document.body.innerText);

    if (!name) return;

    window.ColdReach.sendContact({
      name,
      title,
      location,
      company,
      linkedin_url: window.location.href.split('?')[0],
      email: emails[0] || null,
      source: 'linkedin-profile',
    });
  }, 2500);
})();
