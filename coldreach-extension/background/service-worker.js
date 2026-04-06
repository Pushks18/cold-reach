import { processContact, processJob } from './pipeline.js';

let sessionCount = 0;

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}

async function notifyNewContact(name, email) {
  const { notify = true } = await chrome.storage.local.get('notify');
  if (!notify) return;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon48.png',
    title: 'ColdReach — New Contact',
    message: `${name || 'Unknown'}${email ? ' · ' + email : ''}`,
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const url = sender.tab?.url || '';

  if (msg.type === 'NEW_CONTACT') {
    chrome.storage.local.get('auto-mode').then(({ 'auto-mode': autoMode = true }) => {
      if (!autoMode) { sendResponse({ ok: false, reason: 'auto-mode off' }); return; }
      processContact(msg.contact, url)
        .then((saved) => {
          sessionCount++;
          updateBadge(sessionCount);
          notifyNewContact(saved?.name, saved?.email);
          sendResponse({ ok: true });
        })
        .catch((err) => {
          console.error('[sw] processContact error:', err.message);
          sendResponse({ ok: false, error: err.message });
        });
    });
    return true; // async response
  }

  if (msg.type === 'NEW_JOB') {
    processJob(msg.job)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'MANUAL_SCRAPE') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) { sendResponse({ ok: false, error: 'no active tab' }); return; }
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/extractor.js', 'content/generic.js'],
      })
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
    });
    return true;
  }

  if (msg.type === 'GET_SESSION_COUNT') {
    sendResponse({ count: sessionCount });
  }
});

chrome.runtime.onStartup.addListener(() => {
  sessionCount = 0;
  updateBadge(0);
});
