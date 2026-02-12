// backend/services/browserService.js
import puppeteer from "puppeteer";
import logger from "../utils/logger.js";

const DEFAULT_REFERRERS = ["https://google.com", "https://facebook.com"];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRandomWindowSize() {
  const width = randInt(1024, 1920);
  const height = randInt(768, 1080);
  return { width, height };
}

/**
 * Create a curved path from (x1,y1) -> (x2,y2) using a simple quadratic Bezier.
 */
function bezierPoint(t, p0, p1, p2) {
  // (1-t)^2 p0 + 2(1-t)t p1 + t^2 p2
  const mt = 1 - t;
  const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
  const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
  return { x, y };
}

class BrowserService {
  async launchBrowserWithProxy({ proxyUrl, proxyUsername, proxyPassword, referrers }) {
    const { width, height } = getRandomWindowSize();

    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
      args: [
        `--proxy-server=${proxyUrl}`,
        "--no-proxy-server-bypass",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--ignore-certificate-errors",
        "--disable-infobars",
        "--disable-extensions",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--disable-plugins",
        "--disable-software-rasterizer",
        "--disable-blink-features=AutomationControlled",
        "--no-zygote",
        `--window-size=${width},${height}`,

        // Reduce autofill-ish artifacts (helps "first few chars already filled")
        "--disable-features=AutofillServerCommunication,AutofillEnableAccountWalletStorage,PasswordManagerOnboarding",
        "--disable-save-password-bubble",
      ],
      headless: "new",
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    if (proxyUsername && proxyPassword) {
      await page.authenticate({ username: proxyUsername, password: proxyPassword });
    }

    const refList = Array.isArray(referrers) && referrers.length ? referrers : DEFAULT_REFERRERS;
    const selectedReferer = getRandomElement(refList);

    await page.setExtraHTTPHeaders({ referer: selectedReferer });

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const headers = request.headers();
      headers["referer"] = selectedReferer;
      request.continue({ headers });
    });

    logger.debug("Browser launched with proxy + referer", { proxyUrl, referer: selectedReferer });

    return { browser, page };
  }

  async emulateDevice(page, device) {
    if (!device) return;
    if (device.userAgent) await page.setUserAgent(device.userAgent);
    if (device.viewport) {
      await page.setViewport({
        ...device.viewport,
        isMobile: device.viewport.isMobile || false,
        hasTouch: device.viewport.hasTouch || false,
      });
    }
  }

  // -----------------------------
  // NEW: Page readiness + form visibility
  // -----------------------------

  async waitForDomReady(page, timeoutMs = 45000) {
    await page.waitForFunction(() => document.readyState === "complete", { timeout: timeoutMs });
  }

  async waitForAnyVisibleSelector(page, selectors = [], timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      for (const sel of selectors) {
        try {
          const ok = await page.$eval(
            sel,
            (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
          );
          if (ok) return sel;
        } catch {}
      }
      await sleep(250);
    }
    return null;
  }

  async stabilizeBeforeFilling(page, { formSelectors = [], minWaitMs = 5000, maxWaitMs = 8000 } = {}) {
    // 1) DOM ready
    await this.waitForDomReady(page);

    // 2) Ensure at least one form/field is visible
    if (formSelectors.length) {
      const found = await this.waitForAnyVisibleSelector(page, formSelectors, 20000);
      if (!found) logger.warn("Form/field not visibly ready within timeout", { formSelectors });
    }

    // 3) Random human pause (5–8 seconds)
    const waitMs = randInt(minWaitMs, maxWaitMs);
    await sleep(waitMs);
  }

  // -----------------------------
  // Existing utilities
  // -----------------------------

  async waitForSelectorWithTimeout(page, selector, timeoutMs = 5000) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async getFieldValue(page, selector) {
    return await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.value : null;
    }, selector);
  }

  async scrollIntoViewWithOffset(page, selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        const offset = Math.floor(Math.random() * 80);
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        window.scrollTo({ top: top - offset, behavior: "smooth" });
      }
    }, selector);
    await sleep(randInt(250, 650));
  }

  // -----------------------------
  // NEW: Autofill prevention + reliable clearing
  // -----------------------------
  async disableAutoCompleteOnInputs(page) {
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
      for (const el of inputs) {
        try {
          el.setAttribute("autocomplete", "off");
          el.setAttribute("autocapitalize", "off");
          el.setAttribute("autocorrect", "off");
          el.setAttribute("spellcheck", "false");
        } catch {}
      }
    });
  }

  async clearFieldHard(page, selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.focus();
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, selector);

    // small pause to let TF recorder catch the "empty" state
    await sleep(randInt(80, 180));
  }

  // -----------------------------
  // NEW: Desktop human mouse movement (curved + hover)
  // -----------------------------
  async humanMouseMoveToSelector(page, selector) {
    const box = await page.$eval(selector, (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });

    // target inside element
    const targetX = box.x + randFloat(0.25, 0.75) * box.w;
    const targetY = box.y + randFloat(0.25, 0.75) * box.h;

    // start point: current-ish random point
    const startX = randInt(20, 300);
    const startY = randInt(20, 300);

    // control point to create curve
    const ctrlX = (startX + targetX) / 2 + randInt(-120, 120);
    const ctrlY = (startY + targetY) / 2 + randInt(-120, 120);

    const p0 = { x: startX, y: startY };
    const p1 = { x: ctrlX, y: ctrlY };
    const p2 = { x: targetX, y: targetY };

    const steps = randInt(18, 32);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = bezierPoint(t, p0, p1, p2);
      await page.mouse.move(p.x, p.y);
      await sleep(randInt(6, 18));
    }
  }

  // -----------------------------
  // NEW: Unified "click/tap" that respects device type
  // -----------------------------
  async smartClick(page, selector, { deviceType = "desktop" } = {}) {
    const visible = await this.waitForSelectorWithTimeout(page, selector, 8000);
    if (!visible) return false;

    await this.scrollIntoViewWithOffset(page, selector);

    // MOBILE/TABLET: tap only (no mouse, no cursor trail)
    if (deviceType === "mobile" || deviceType === "tablet") {
      // Puppeteer will generate touch events when hasTouch=true
      await page.tap(selector);
      await sleep(randInt(120, 260));
      return true;
    }

    // DESKTOP: human-like move + hover + click
    await this.humanMouseMoveToSelector(page, selector);
    await page.hover(selector);
    await sleep(randInt(180, 420));
    await page.click(selector, { delay: randInt(30, 110) });
    await sleep(randInt(120, 260));
    return true;
  }

  async smartFocus(page, selector, { deviceType = "desktop" } = {}) {
    const visible = await this.waitForSelectorWithTimeout(page, selector, 8000);
    if (!visible) return false;

    await this.scrollIntoViewWithOffset(page, selector);

    if (deviceType === "mobile" || deviceType === "tablet") {
      await page.tap(selector); // touch focus (no cursor)
      await sleep(randInt(120, 260));
      return true;
    }

    await this.humanMouseMoveToSelector(page, selector);
    await page.hover(selector);
    await sleep(randInt(160, 320));
    await page.click(selector, { delay: randInt(20, 80) });
    await sleep(randInt(120, 260));
    return true;
  }

  // Backward compatible: keep old name used elsewhere
  async hoverAndClick(page, selector) {
    return this.smartClick(page, selector, { deviceType: "desktop" });
  }

  async closeBrowser(browser) {
    try {
      if (browser) await browser.close();
    } catch (e) {
      logger.warn("Browser close failed", { error: e?.message });
    }
  }
}

export default new BrowserService();
