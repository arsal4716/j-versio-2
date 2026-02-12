// backend/services/browserService.js
import puppeteer from "puppeteer";
import logger from "../utils/logger.js";

const DEFAULT_REFERRERS = ["https://google.com", "https://facebook.com"];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomWindowSize() {
  const width = Math.floor(Math.random() * (1920 - 1024 + 1)) + 1024;
  const height = Math.floor(Math.random() * (1080 - 768 + 1)) + 768;
  return { width, height };
}

class BrowserService {
  /**
   * Launches a browser with proxy and a random referrer.
   */
  async launchBrowserWithProxy({ proxyUrl, proxyUsername, proxyPassword, referrers }) {
    const { width, height } = getRandomWindowSize();
    let browser;

    browser = await puppeteer.launch({
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
   */
  async scrollIntoViewWithOffset(page, selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        const offset = Math.floor(Math.random() * 80);
        window.scrollTo({ top: el.offsetTop - offset, behavior: "smooth" });
      }
    }, selector);
    // Small human-like pause after scroll
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 400 + 200)));
  }

  /**
   * Moves the mouse cursor to the center of an element in 25 incremental steps.
   * This simulates a visible cursor traveling to the field – only used on desktop.
   */
  async moveMouseToElement(page, selector, steps = 25) {
    const elementHandle = await page.$(selector);
    if (!elementHandle) {
      throw new Error(`Element not found: ${selector}`);
    }
    const box = await elementHandle.boundingBox();
    if (!box) {
      throw new Error(`Element has no bounding box: ${selector}`);
    }
    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;

    // Get current mouse position (Puppeteer doesn't expose it, so we start from a corner)
    const startX = 0;
    const startY = 0;

    for (let i = 1; i <= steps; i++) {
      const x = startX + (targetX - startX) * (i / steps);
      const y = startY + (targetY - startY) * (i / steps);
      await page.mouse.move(x, y);
      // No artificial delay between steps – the default 25 steps are fast but visible in playback
    }
  }

  /**
   * Clicks (or taps) an element in a human-like, device-appropriate way.
   * - Desktop: scroll, move mouse with 25 steps, hover, then click.
   * - Mobile/Tablet: scroll, then directly tap (no cursor movement).
   */
  async clickElement(page, selector, deviceType, options = {}) {
    const isDesktop = deviceType === "desktop";
    const isVisible = await this.waitForSelectorWithTimeout(page, selector, 5000);
    if (!isVisible) {
      throw new Error(`Element not visible: ${selector}`);
    }

    await this.scrollIntoViewWithOffset(page, selector);

    if (isDesktop) {
      // Human-like mouse movement with visible cursor trail
      await this.moveMouseToElement(page, selector);
      // Brief pause before clicking (as if user hesitates)
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 200 + 100)));
      await page.click(selector);
    } else {
      // Touch devices: no mouse movement, just tap
      await page.tap(selector);
    }
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