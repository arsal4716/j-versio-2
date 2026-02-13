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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ---- Mouse state is per Page (so movement paths vary naturally) ----
const mouseStateByPage = new WeakMap(); // page -> { x, y }

function getMouseState(page) {
  if (!mouseStateByPage.has(page)) {
    // Start from a random on-screen point to avoid identical "from corner" trails
    mouseStateByPage.set(page, { x: randInt(40, 220), y: randInt(60, 240) });
  }
  return mouseStateByPage.get(page);
}

function setMouseState(page, x, y) {
  mouseStateByPage.set(page, { x, y });
}

// Cubic Bezier point
function cubicBezier(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
  return { x, y };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getRandomWindowSize() {
  const width = randInt(1024, 1920);
  const height = randInt(768, 1080);
  return { width, height };
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

    // Initialize mouse state for this page (unique per session)
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
   * Smoothly scrolls the element into view with a random offset.
   * Improved to center-ish the element in viewport so playback clearly shows it.
   */
  async scrollIntoViewWithOffset(page, selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;

      const r = el.getBoundingClientRect();
      const viewportH = window.innerHeight || 800;

      // Aim to bring element near middle with slight randomness
      const targetY =
        window.scrollY + r.top - viewportH * (0.35 + Math.random() * 0.15) - Math.floor(Math.random() * 60);

      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }, selector);

    // Human-like pause after scroll
    await sleep(randInt(220, 650));
  }

  /**
   * Computes a "human" target point inside element bounds.
   * Avoids exact center every time (important for checkbox realism).
   */
  async getHumanPointInElement(page, selector, purpose = "generic") {
    const handle = await page.$(selector);
    if (!handle) throw new Error(`Element not found: ${selector}`);
    const box = await handle.boundingBox();
    if (!box) throw new Error(`Element has no bounding box: ${selector}`);

    // Different click zones per purpose
    let minXFactor = 0.30,
      maxXFactor = 0.70,
      minYFactor = 0.30,
      maxYFactor = 0.70;

    if (purpose === "checkbox") {
      // Click inside checkbox bounds but not always center
      minXFactor = 0.22;
      maxXFactor = 0.78;
      minYFactor = 0.22;
      maxYFactor = 0.78;
    } else if (purpose === "submit") {
      // Slightly favor center but still random
      minXFactor = 0.35;
      maxXFactor = 0.65;
      minYFactor = 0.35;
      maxYFactor = 0.65;
    }

    const x = box.x + box.width * randFloat(minXFactor, maxXFactor);
    const y = box.y + box.height * randFloat(minYFactor, maxYFactor);

    // Clamp to viewport bounds (safety)
    const vp = page.viewport() || { width: 1366, height: 768 };
    return {
      x: clamp(x, 1, vp.width - 2),
      y: clamp(y, 1, vp.height - 2),
      box,
    };
  }

  /**
   * Human-like mouse movement using cubic Bezier curves, variable speed,
   * pauses, and micro-adjustments. Ensures uniqueness across submissions.
   */
  async humanMouseMove(page, toX, toY, options = {}) {
    const state = getMouseState(page);
    const fromX = state.x;
    const fromY = state.y;

    const distance = Math.hypot(toX - fromX, toY - fromY);

    // Steps scale with distance + randomness (prevents identical paths)
    const baseSteps = clamp(Math.floor(distance / randFloat(8.5, 14.5)), 18, 70);
    const steps = baseSteps + randInt(-3, 6);

    // Control points: random curvature (unique each move)
    const p0 = { x: fromX, y: fromY };
    const p3 = { x: toX, y: toY };

    const curveScale = clamp(distance * randFloat(0.18, 0.38), 30, 420);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Perpendicular offset (both directions possible)
    const perp = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);

    const p1 = {
      x: fromX + Math.cos(angle) * curveScale * randFloat(0.30, 0.55) + Math.cos(perp) * randFloat(-curveScale, curveScale),
      y: fromY + Math.sin(angle) * curveScale * randFloat(0.30, 0.55) + Math.sin(perp) * randFloat(-curveScale, curveScale),
    };

    const p2 = {
      x: toX - Math.cos(angle) * curveScale * randFloat(0.30, 0.55) + Math.cos(perp) * randFloat(-curveScale, curveScale),
      y: toY - Math.sin(angle) * curveScale * randFloat(0.30, 0.55) + Math.sin(perp) * randFloat(-curveScale, curveScale),
    };

    // Variable speed: delays per step (gives visible, human timing)
    const minDelay = options.minDelayMs ?? randInt(2, 9);
    const maxDelay = options.maxDelayMs ?? randInt(9, 22);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;

      // Ease-in-out so speed varies naturally
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const pt = cubicBezier(eased, p0, p1, p2, p3);

      // Small jitter (micro hand tremor), reduced near target
      const jitterScale = (1 - t) * randFloat(0.6, 1.6);
      const jx = randFloat(-jitterScale, jitterScale);
      const jy = randFloat(-jitterScale, jitterScale);

      await page.mouse.move(pt.x + jx, pt.y + jy);

      // Random micro-pauses along path
      if (Math.random() < 0.06) {
        await sleep(randInt(18, 75));
      } else {
        await sleep(randInt(minDelay, maxDelay));
      }
    }

    setMouseState(page, toX, toY);
  }

  /**
   * Micro-adjust around a target point (for checkbox + clicks)
   */
  async microAdjust(page, x, y) {
    const n = randInt(2, 4);
    for (let i = 0; i < n; i++) {
      const dx = randFloat(-3.2, 3.2);
      const dy = randFloat(-3.2, 3.2);
      await page.mouse.move(x + dx, y + dy);
      await sleep(randInt(18, 60));
    }
    await page.mouse.move(x, y);
    await sleep(randInt(40, 120));
    setMouseState(page, x, y);
  }

  /**
   * Moves mouse to element using human mouse move (desktop only).
   * Kept name for compatibility with existing calls.
   */
  async moveMouseToElement(page, selector) {
    const { x, y } = await this.getHumanPointInElement(page, selector, "generic");
    await this.humanMouseMove(page, x, y, {
      minDelayMs: randInt(2, 9),
      maxDelayMs: randInt(10, 26),
    });
  }

  /**
   * Clicks (or taps) an element in a human-like, device-appropriate way.
   * - Desktop: scroll, human-move (Bezier), hover delay, micro-adjust, click at offset.
   * - Mobile/Tablet: scroll, then tap (no cursor movement).
   */
  async clickElement(page, selector, deviceType, options = {}) {
    const isDesktop = deviceType === "desktop";
    const purpose = options.purpose || "generic";

    const isVisible = await this.waitForSelectorWithTimeout(page, selector, options.timeoutMs || 6000);
    if (!isVisible) throw new Error(`Element not visible: ${selector}`);

    await this.scrollIntoViewWithOffset(page, selector);

    if (!isDesktop) {
      // Touch devices: no visible cursor movement
      await page.tap(selector);
      // Small natural pause after tap
      await sleep(randInt(120, 420));
      return;
    }

    const { x, y } = await this.getHumanPointInElement(page, selector, purpose);

    // Human move with unique curve + speed variation
    await this.humanMouseMove(page, x, y, {
      minDelayMs: randInt(2, 10),
      maxDelayMs: randInt(10, 28),
    });

    // Hover delay (checkbox requirement: 200–800ms random)
    const hoverDelay =
      typeof options.hoverDelayMs === "number"
        ? options.hoverDelayMs
        : purpose === "checkbox"
          ? randInt(200, 800)
          : randInt(120, 480);

    await sleep(hoverDelay);

    // Micro adjust before click (looks real in playback)
    if (options.microAdjust !== false) {
      await this.microAdjust(page, x, y);
    }

    // Real mouse click at coordinates (not always page.click center)
    await page.mouse.down();
    await sleep(randInt(35, 95));
    await page.mouse.up();

    await sleep(randInt(140, 520));
  }

  /**
   * Submit click + light post-click waiting for ANY of:
   * - navigation
   * - network idle
   * - url change
   * - small DOM change window
   *
   * This is designed for 100+ sites (redirect, same page, AJAX).
   * It does NOT replace your enforced 9s delay (that’s handled in SubmissionService).
   */
  async clickSubmitAndWait(page, submitSelector, deviceType) {
    const initialUrl = page.url();

    // Prepare a lightweight DOM change sentinel (safe, no refactor)
    const domSentinel = await page.evaluate(() => {
      try {
        const b = document.body;
        return b ? (b.innerText || "").length : 0;
      } catch {
        return 0;
      }
    });

    // Click human-like
    await this.clickElement(page, submitSelector, deviceType, {
      purpose: "submit",
      hoverDelayMs: randInt(180, 650),
      microAdjust: true,
      timeoutMs: 8000,
    });

    // Post-click waits (best effort, never throws)
    const waiters = [];

    // 1) Navigation (redirect / thank-you page)
    waiters.push(
      page
        .waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 })
        .catch(() => null),
    );

    // 2) Network idle (AJAX submit)
    if (typeof page.waitForNetworkIdle === "function") {
      waiters.push(page.waitForNetworkIdle({ idleTime: 600, timeout: 8000 }).catch(() => null));
    }

    // 3) URL change without full navigation
    waiters.push(
      page
        .waitForFunction(() => location.href !== (window.___u0 || ""), { timeout: 8000 })
        .catch(() => null),
    );

    // seed url in page context (safe)
    await page.evaluate((u) => {
      window.___u0 = u;
    }, initialUrl);

    // 4) DOM text length changes (some same-page submissions update DOM)
    waiters.push(
      page
        .waitForFunction(
          (len0) => {
            try {
              const b = document.body;
              const len1 = b ? (b.innerText || "").length : 0;
              return Math.abs(len1 - len0) > 40;
            } catch {
              return false;
            }
          },
          { timeout: 8000 },
          domSentinel,
        )
        .catch(() => null),
    );

    // 5) Always allow a short minimum settle time
    waiters.push(sleep(randInt(700, 1400)));

    await Promise.race(waiters);

    // small settle after whichever finishes first
    await sleep(randInt(250, 650));
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
