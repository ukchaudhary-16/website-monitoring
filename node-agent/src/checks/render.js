const cfg = require("../config");

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  const puppeteer = require("puppeteer");
  _browser = await puppeteer.launch({
    headless: cfg.headless ? "new" : false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  return _browser;
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}

// The check cloud pingers miss: actually render the page and confirm real content
// mounted. A 200 with an empty <body> / no expected element => SPA is broken.
async function renderCheck(url, expectedSelector, timeoutMs = cfg.renderTimeoutMs) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent("DePIN-Monitor-Node/1.0 (headless render check)");

  const start = Date.now();
  try {
    const resp = await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
    const httpStatus = resp ? resp.status() : null;

    if (expectedSelector) {
      try {
        await page.waitForSelector(expectedSelector, { timeout: Math.min(8000, timeoutMs) });
      } catch {
        return {
          renderOk: false,
          httpStatus,
          responseTimeMs: Date.now() - start,
          detail: `expected selector "${expectedSelector}" never appeared (blank/broken SPA?)`,
        };
      }
    }

    // Heuristic when no selector configured: page must have non-trivial text.
    const textLen = await page.evaluate(() => (document.body?.innerText || "").trim().length);
    const renderOk = expectedSelector ? true : textLen > 20;

    return {
      renderOk,
      httpStatus,
      responseTimeMs: Date.now() - start,
      detail: renderOk ? `rendered ok (${textLen} chars)` : `body rendered only ${textLen} chars`,
    };
  } catch (e) {
    return {
      renderOk: false,
      httpStatus: null,
      responseTimeMs: Date.now() - start,
      detail: `render failed: ${e.message}`,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { renderCheck, closeBrowser };
