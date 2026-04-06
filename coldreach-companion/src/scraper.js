const { chromium } = require('playwright');

let browser = null;
let context = null;
let currentProfilePath = undefined;

async function getBrowserContext(profilePath) {
  // If context exists but profile mode changed, close and recreate
  if (context && currentProfilePath !== profilePath) {
    await closeBrowser();
  }
  if (context) return context;
  currentProfilePath = profilePath;

  if (profilePath) {
    // Use real Chrome (not Playwright's Chromium) with existing logged-in profile
    context = await chromium.launchPersistentContext(profilePath, {
      channel: 'chrome',   // use system Chrome binary, not bundled Chromium
      headless: false,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
  } else {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
  }

  return context;
}

async function newPage(profilePath) {
  const ctx = await getBrowserContext(profilePath);
  return ctx.newPage();
}

async function closeBrowser() {
  if (context) { await context.close(); context = null; }
  if (browser) { await browser.close(); browser = null; }
  currentProfilePath = undefined;
}

module.exports = { newPage, closeBrowser };
