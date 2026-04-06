(function() {
  setTimeout(function() {
    // LinkedIn 2026: uses h2 for profile name (classes are obfuscated/randomized)
    // Grab the first h2 inside the profile card anchor (href matches /in/*)
    const profileAnchor = document.querySelector('a[href*="/in/"]');
    const nameEl = profileAnchor?.closest('[componentkey]')?.querySelector('h2') ||
                   document.querySelector('h2');

    const name = nameEl?.innerText?.trim();

    // Title: first div/span after the name h2 that has substantial text
    const titleEl = nameEl?.parentElement?.nextElementSibling;
    const title = titleEl?.innerText?.trim() || null;

    // Location: look for a span with location-like text near the top section
    const allSpans = Array.from(document.querySelectorAll('span')).filter(el =>
      el.childElementCount === 0 && el.innerText?.trim().length > 3
    );
    const location = null; // hard to reliably detect without stable selectors

    const emails = window.ColdReach.extractEmails(document.body.innerText);

    console.log('[ColdReach] linkedin-profile scrape:', { name, title, emailsFound: emails.length });

    if (!name) {
      console.warn('[ColdReach] Could not find profile name');
      return;
    }

    window.ColdReach.sendContact({
      name,
      title,
      location,
      linkedin_url: window.location.href.split('?')[0],
      email: emails[0] || null,
      source: 'linkedin-profile',
    });
  }, 3000);
})();
