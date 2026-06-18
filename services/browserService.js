// backend/services/browserService.js
// Playwright-based human-behavior automation engine.
// Public method surface is preserved 1:1 with the previous Puppeteer service
// so submissionService.js requires no changes to its call sites.
import { chromium } from "playwright";
import logger from "../utils/logger.js";

const DEFAULT_REFERRERS = ["https://google.com", "https://facebook.com"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getRandomWindowSize() {
  return { width: randInt(1024, 1920), height: randInt(768, 1080) };
}

// Per-page cursor memory so movement never starts from (0,0) every time.
const mouseStateByPage = new WeakMap();
function getMouseState(page) {
  if (!mouseStateByPage.has(page)) {
    mouseStateByPage.set(page, { x: randInt(40, 220), y: randInt(60, 240) });
  }
  return mouseStateByPage.get(page);
}
function setMouseState(page, x, y) {
  mouseStateByPage.set(page, { x, y });
}

function cubicBezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function normalizeSelector(sel) {
  let s = (sel || "").trim();
  if (!s) return s;
  if (!s.startsWith("#") && !s.startsWith(".") && !s.startsWith("[") && !/\s/.test(s)) {
    // bare id/name → treat as id, matching prior behavior in submissionService
    s = `#${s}`;
  }
  return s;
}

class BrowserService {
  /**
   * Launch Chromium with proxy + referer. Returns { browser, context, page }.
   * Playwright applies proxy auth and referer at the context level (no request
   * interception needed), which is both faster and less detectable.
   */
  async launchBrowserWithProxy({ proxyUrl, proxyUsername, proxyPassword, referrers, device }) {
    const { width, height } = getRandomWindowSize();

    const launchArgs = [
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
      "--disable-software-rasterizer",
      "--disable-blink-features=AutomationControlled",
      "--no-zygote",
      `--window-size=${width},${height}`,
    ];

    // Playwright proxy: split host:port from the http://host:port string.
    let proxyOption;
    if (proxyUrl) {
      const cleaned = proxyUrl.replace(/^https?:\/\//, "");
      proxyOption = {
        server: `http://${cleaned}`,
        username: proxyUsername || undefined,
        password: proxyPassword || undefined,
      };
    }

    const browser = await chromium.launch({
      headless: true,
      args: launchArgs,
      proxy: proxyOption,
    });

    const refList = Array.isArray(referrers) && referrers.length ? referrers : DEFAULT_REFERRERS;
    const selectedReferer = getRandomElement(refList);

    // Match the context to the emulated device. hasTouch / isMobile / userAgent
    // can ONLY be set at context-creation time — without hasTouch, page.tap()
    // throws "The page does not support tap" for mobile/tablet devices.
    const dv = device?.viewport || {};
    const contextOptions = {
      viewport: {
        width: dv.width || 1366,
        height: dv.height || 768,
      },
      deviceScaleFactor: dv.deviceScaleFactor || 1,
      isMobile: !!dv.isMobile,
      hasTouch: !!dv.hasTouch,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { referer: selectedReferer },
    };
    if (device?.userAgent) contextOptions.userAgent = device.userAgent;

    const context = await browser.newContext(contextOptions);

    // Mask the most obvious automation fingerprint.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    const page = await context.newPage();
    page._selectedReferer = selectedReferer;
    setMouseState(page, randInt(40, 220), randInt(60, 240));

    logger.debug("Browser launched with proxy + referer", {
      proxyUrl,
      referer: selectedReferer,
    });

    return { browser, context, page };
  }

  /**
   * Apply device emulation (UA + viewport + touch). Playwright sets UA on the
   * context, but for a single-page flow we recreate the viewport on the page.
   */
  async emulateDevice(page, device) {
    if (!device) return;
    if (device.viewport) {
      await page.setViewportSize({
        width: device.viewport.width,
        height: device.viewport.height,
      });
    }
    // userAgent is applied via context in launch for new flows; for already-open
    // pages we set it through an init script fallback.
    if (device.userAgent) {
      await page.addInitScript((ua) => {
        Object.defineProperty(navigator, "userAgent", { get: () => ua });
      }, device.userAgent);
    }
  }

  async waitForSelectorWithTimeout(page, selector, timeoutMs = 5000) {
    try {
      await page.waitForSelector(normalizeSelector(selector), {
        state: "visible",
        timeout: timeoutMs,
      });
      return true;
    } catch {
      return false;
    }
  }

  async getFieldValue(page, selector) {
    try {
      return await page.$eval(normalizeSelector(selector), (el) => el.value ?? null);
    } catch {
      return null;
    }
  }

  async scrollIntoViewWithOffset(page, selector) {
    const sel = normalizeSelector(selector);
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const targetY =
        window.scrollY + r.top - vh * (0.35 + Math.random() * 0.15) - Math.floor(Math.random() * 50);
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }, sel);
    await sleep(randInt(160, 420));
  }

  async getHumanPointInElement(page, selector, purpose = "generic") {
    const sel = normalizeSelector(selector);
    const handle = await page.$(sel);
    if (!handle) throw new Error(`Element not found: ${selector}`);
    const box = await handle.boundingBox();
    if (!box) throw new Error(`Element has no bounding box: ${selector}`);

    let minX = 0.3, maxX = 0.7, minY = 0.3, maxY = 0.7;
    if (purpose === "checkbox") { minX = 0.18; maxX = 0.82; minY = 0.18; maxY = 0.82; }
    else if (purpose === "submit") { minX = 0.35; maxX = 0.65; minY = 0.35; maxY = 0.65; }

    const x = box.x + box.width * randFloat(minX, maxX);
    const y = box.y + box.height * randFloat(minY, maxY);
    const vp = page.viewportSize() || { width: 1366, height: 768 };
    return {
      x: clamp(x, 2, vp.width - 3),
      y: clamp(y, 2, vp.height - 3),
      box,
    };
  }

  async humanMouseMove(page, toX, toY) {
    const state = getMouseState(page);
    const fromX = state.x;
    const fromY = state.y;

    const distance = Math.hypot(toX - fromX, toY - fromY);
    const steps = clamp(Math.floor(distance / randFloat(9, 15)) + randInt(-2, 6), 18, 70);

    const p0 = { x: fromX, y: fromY };
    const p3 = { x: toX, y: toY };
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const perp = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const curve = clamp(distance * randFloat(0.18, 0.38), 25, 420);

    const p1 = {
      x: fromX + Math.cos(angle) * curve * randFloat(0.3, 0.55) + Math.cos(perp) * randFloat(-curve, curve),
      y: fromY + Math.sin(angle) * curve * randFloat(0.3, 0.55) + Math.sin(perp) * randFloat(-curve, curve),
    };
    const p2 = {
      x: toX - Math.cos(angle) * curve * randFloat(0.3, 0.55) + Math.cos(perp) * randFloat(-curve, curve),
      y: toY - Math.sin(angle) * curve * randFloat(0.3, 0.55) + Math.sin(perp) * randFloat(-curve, curve),
    };

    const minDelay = randInt(1, 6);
    const maxDelay = randInt(6, 16);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const pt = cubicBezierPoint(eased, p0, p1, p2, p3);
      const jitter = (1 - t) * randFloat(0.4, 1.4);
      await page.mouse.move(pt.x + randFloat(-jitter, jitter), pt.y + randFloat(-jitter, jitter));
      if (Math.random() < 0.06) await sleep(randInt(14, 55));
      else await sleep(randInt(minDelay, maxDelay));
    }
    setMouseState(page, toX, toY);
  }

  async microAdjust(page, x, y) {
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      await page.mouse.move(x + randFloat(-3, 3), y + randFloat(-3, 3));
      await sleep(randInt(12, 45));
    }
    await page.mouse.move(x, y);
    await sleep(randInt(20, 90));
    setMouseState(page, x, y);
  }

  async moveMouseToElement(page, selector) {
    const { x, y } = await this.getHumanPointInElement(page, selector, "generic");
    await this.humanMouseMove(page, x, y);
  }

  async clickElement(page, selector, deviceType, options = {}) {
    const sel = normalizeSelector(selector);
    const isDesktop = deviceType === "desktop";
    const purpose = options.purpose || "generic";
    const timeoutMs = options.timeoutMs || 6000;

    const visible = await this.waitForSelectorWithTimeout(page, sel, timeoutMs);
    if (!visible) throw new Error(`Element not visible: ${selector}`);

    await this.scrollIntoViewWithOffset(page, sel);

    if (!isDesktop) {
      await page.tap(sel);
      await sleep(randInt(100, 350));
      return;
    }

    const { x, y } = await this.getHumanPointInElement(page, sel, purpose);
    await this.humanMouseMove(page, x, y);

    const hoverDelay =
      typeof options.hoverDelayMs === "number"
        ? options.hoverDelayMs
        : purpose === "checkbox"
          ? randInt(200, 800)
          : randInt(120, 420);
    await sleep(hoverDelay);

    if (options.microAdjust !== false) await this.microAdjust(page, x, y);

    await page.mouse.down();
    await sleep(randInt(25, 90));
    await page.mouse.up();
    await sleep(randInt(120, 420));
  }

  async hoverAndClick(page, selector, deviceType) {
    try {
      await this.clickElement(page, selector, deviceType);
      return true;
    } catch {
      return false;
    }
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
