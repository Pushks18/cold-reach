// Shared DOM utilities — loaded before all content scripts via manifest.json ordering
window.ColdReach = window.ColdReach || {};

window.ColdReach.extractEmails = function(text) {
  const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(re) || [])];
};

window.ColdReach.cleanText = function(el) {
  return el?.innerText?.trim().replace(/\s+/g, ' ') || '';
};

window.ColdReach.sendContact = function(contact) {
  if (!contact.name && !contact.email) return;
  chrome.runtime.sendMessage({
    type: 'NEW_CONTACT',
    contact,
    url: location.href,
  });
};

window.ColdReach.sendJob = function(job) {
  if (!job.title) return;
  chrome.runtime.sendMessage({ type: 'NEW_JOB', job });
};
