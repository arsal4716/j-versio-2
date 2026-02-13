// backend/services/browserService.js
import puppeteer from "puppeteer";
import logger from "../utils/logger.js";

const DEFAULT_REFERRERS = ["https://google.com", "https://facebook.com"];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getRandomWindowSize() {
  const width = randInt(1024, 1920);
  const height = randInt(768, 1080);
  return { width, height };
}

/**
 * Keep per-page mouse position so every move is unique and NOT always from (0,0).
 */
const mouseStateByPage = new WeakMap(); // page -> { x, y }

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

class BrowserService {
  /**
   * Launches a browser with proxy and a random referrer.
   */
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
      ],
      headless: "new",
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Seed unique starting cursor point per page/session
    setMouseState(page, randInt(40, 220), randInt(60, 240));

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

  /**
   * Emulates a device (viewport, userAgent, touch capabilities).
   */
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

  /**
   * Waits for a selector to be visible with a timeout.
   */
  async waitForSelectorWithTimeout(page, selector, timeoutMs = 5000) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the value of an input field.
   */
  async getFieldValue(page, selector) {
    return await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.value : null;
    }, selector);
  }

  /**
   * Improved scroll: tries to bring target near middle for playback visibility.
   * (Still fast; does not add heavy delays)
   */
  async scrollIntoViewWithOffset(page, selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;

      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;

      // Bring element to ~40% from top with slight randomness
      const targetY =
        window.scrollY + r.top - vh * (0.35 + Math.random() * 0.15) - Math.floor(Math.random() * 50);

      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }, selector);

    await sleep(randInt(160, 420));
  }

  /**
   * Pick a random realistic point inside the element (not always center).
   * For checkbox: a bit more spread, for submit: slightly more centered.
   */
  async getHumanPointInElement(page, selector, purpose = "generic") {
    const elementHandle = await page.$(selector);
    if (!elementHandle) throw new Error(`Element not found: ${selector}`);

    const box = await elementHandle.boundingBox();
    if (!box) throw new Error(`Element has no bounding box: ${selector}`);

    let minX = 0.30, maxX = 0.70, minY = 0.30, maxY = 0.70;

    if (purpose === "checkbox") {
      minX = 0.18; maxX = 0.82;
      minY = 0.18; maxY = 0.82;
    } else if (purpose === "submit") {
      minX = 0.35; maxX = 0.65;
      minY = 0.35; maxY = 0.65;
    }

    const x = box.x + box.width * randFloat(minX, maxX);
    const y = box.y + box.height * randFloat(minY, maxY);

    const vp = page.viewport() || { width: 1366, height: 768 };

    return {
      x: clamp(x, 2, vp.width - 3),
      y: clamp(y, 2, vp.height - 3),
      box,
    };
  }

  /**
   * Human-like Bezier mouse move with variable speed + tiny pauses.
   * UNIQUE path each time due to random control points & jitter.
   */
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
      x: fromX + Math.cos(angle) * curve * randFloat(0.30, 0.55) + Math.cos(perp) * randFloat(-curve, curve),
      y: fromY + Math.sin(angle) * curve * randFloat(0.30, 0.55) + Math.sin(perp) * randFloat(-curve, curve),
    };

    const p2 = {
      x: toX - Math.cos(angle) * curve * randFloat(0.30, 0.55) + Math.cos(perp) * randFloat(-curve, curve),
      y: toY - Math.sin(angle) * curve * randFloat(0.30, 0.55) + Math.sin(perp) * randFloat(-curve, curve),
    };

    const minDelay = randInt(1, 6);
    const maxDelay = randInt(6, 16);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;

      // ease-in-out speed profile
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const pt = cubicBezierPoint(eased, p0, p1, p2, p3);

      // jitter reduces as it approaches target
      const jitter = (1 - t) * randFloat(0.4, 1.4);
      await page.mouse.move(pt.x + randFloat(-jitter, jitter), pt.y + randFloat(-jitter, jitter));

      if (Math.random() < 0.06) await sleep(randInt(14, 55));
      else await sleep(randInt(minDelay, maxDelay));
    }

    setMouseState(page, toX, toY);
  }

  /**
   * Micro-adjust before clicking (tiny small moves)
   */
  async microAdjust(page, x, y) {
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      await page.mouse.move(x + randFloat(-3.0, 3.0), y + randFloat(-3.0, 3.0));
      await sleep(randInt(12, 45));
    }
    await page.mouse.move(x, y);
    await sleep(randInt(20, 90));
    setMouseState(page, x, y);
  }

  /**
   * Backward compatible function name used by your code.
   * Now uses unique Bezier movement + offset target point.
   */
  async moveMouseToElement(page, selector) {
    const { x, y } = await this.getHumanPointInElement(page, selector, "generic");
    await this.humanMouseMove(page, x, y);
  }

  /**
   * Clicks (or taps) an element in a human-like, device-appropriate way.
   * Desktop:
   * - scroll
   * - move mouse (Bezier unique path)
   * - hover delay (random)
   * - micro-adjust
   * - mouse down/up (real click)
   *
   * Mobile/Tablet:
   * - scroll
   * - tap
   */
  async clickElement(page, selector, deviceType, options = {}) {
    const isDesktop = deviceType === "desktop";
    const purpose = options.purpose || "generic";
    const timeoutMs = options.timeoutMs || 6000;

    const isVisible = await this.waitForSelectorWithTimeout(page, selector, timeoutMs);
    if (!isVisible) throw new Error(`Element not visible: ${selector}`);

    await this.scrollIntoViewWithOffset(page, selector);

    if (!isDesktop) {
      await page.tap(selector);
      await sleep(randInt(100, 350));
      return;
    }

    const { x, y } = await this.getHumanPointInElement(page, selector, purpose);

    await this.humanMouseMove(page, x, y);

    // Hover delay
    const hoverDelay =
      typeof options.hoverDelayMs === "number"
        ? options.hoverDelayMs
        : purpose === "checkbox"
          ? randInt(200, 800)
          : randInt(120, 420);

    await sleep(hoverDelay);

    // Micro adjust before click
    if (options.microAdjust !== false) {
      await this.microAdjust(page, x, y);
    }

    // Real click (mouse down/up) at that point
    await page.mouse.down();
    await sleep(randInt(25, 90));
    await page.mouse.up();

    await sleep(randInt(120, 420));
  }

  /**
   * Legacy method kept for backward compatibility – now uses clickElement.
   */
  async hoverAndClick(page, selector, deviceType) {
    try {
      await this.clickElement(page, selector, deviceType);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Closes the browser instance.
   */
  async closeBrowser(browser) {
    try {
      if (browser) await browser.close();
    } catch (e) {
      logger.warn("Browser close failed", { error: e?.message });
    }
  }
}

export default new BrowserService();
