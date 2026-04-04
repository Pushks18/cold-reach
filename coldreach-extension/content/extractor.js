window.ColdReach = window.ColdReach || {};
window.ColdReach.extractEmails = function(t) { return [...new Set((t.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g))||[])]; };
window.ColdReach.cleanText = function(el) { return el?.innerText?.trim().replace(/\s+/g," ") || ""; };
window.ColdReach.sendContact = function(c) { if(!c.name&&!c.email) return; chrome.runtime.sendMessage({type:"NEW_CONTACT",contact:c,url:location.href}); };
