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
//
// Strategy: navigate with `domcontentloaded` (fast + reliable — `networkidle`
// never fires on busy sites like YouTube), then give the SPA a moment to mount,
// then check for the expected selector / non-trivial text. A navigation timeout
// after we already have a response is treated as "slow but rendered", not down.
async function renderCheck(url, expectedSelector, timeoutMs = cfg.renderTimeoutMs) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36 DePIN-Monitor-Node/1.0"
  );

  const start = Date.now();
  let httpStatus = null;
  try {
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      httpStatus = resp ? resp.status() : null;
    } catch (navErr) {
      // If nothing loaded at all, it's down. If we have a document, keep going.
      const hasDoc = await page.evaluate(() => !!document.body).catch(() => false);
      if (!hasDoc) {
        return {
          renderOk: false,
          httpStatus: null,
          responseTimeMs: Date.now() - start,
          detail: `navigation failed: ${navErr.message}`,
        };
      }
    }

    if (httpStatus && httpStatus >= 400) {
      return {
        renderOk: false,
        httpStatus,
        responseTimeMs: Date.now() - start,
        detail: `HTTP ${httpStatus} on render`,
      };
    }

    if (expectedSelector) {
      try {
        await page.waitForSelector(expectedSelector, { visible: true, timeout: 10000 });
      } catch {
        return {
          renderOk: false,
          httpStatus,
          responseTimeMs: Date.now() - start,
          detail: `expected selector "${expectedSelector}" never appeared (blank/broken SPA?)`,
        };
      }
      return {
        renderOk: true,
        httpStatus,
        responseTimeMs: Date.now() - start,
        detail: `selector "${expectedSelector}" rendered`,
      };
    }

    // No selector: let the app mount, then require non-trivial visible text.
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 6000 }).catch(() => {});
    const textLen = await page
      .evaluate(() => (document.body?.innerText || "").trim().length)
      .catch(() => 0);
    const renderOk = textLen > 50;

    return {
      renderOk,
      httpStatus,
      responseTimeMs: Date.now() - start,
      detail: renderOk ? `rendered ok (${textLen} chars)` : `body rendered only ${textLen} chars`,
    };
  } catch (e) {
    return {
      renderOk: false,
      httpStatus,
      responseTimeMs: Date.now() - start,
      detail: `render error: ${e.message}`,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { renderCheck, closeBrowser };
