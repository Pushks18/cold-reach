(function() {
  const emails = window.ColdReach.extractEmails(document.body.innerText);
  emails.forEach(function(email) {
    window.ColdReach.sendContact({ email, source: 'generic', company: document.title });
  });
})();
