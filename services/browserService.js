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
  constructor() {
    // Tracks mouse position so movement starts from the last field, not (0,0)
    this.currentMouseX = 100;
    this.currentMouseY = 100;
  }

  async launchBrowserWithProxy({ proxyUrl, proxyUsername, proxyPassword, referrers }) {
    const { width, height } = getRandomWindowSize();
    
    const browser = await puppeteer.launch({
      executablePath: "/usr/bin/google-chrome",
      args: [
        `--proxy-server=${proxyUrl}`,
        "--no-proxy-server-bypass",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
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

  async waitForSelectorWithTimeout(page, selector, timeoutMs = 7000) {
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
        const offset = Math.floor(Math.random() * 150) + 100; // Larger offset to center element
        window.scrollTo({ top: el.offsetTop - offset, behavior: "smooth" });
      }
    }, selector);
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 500 + 300)));
  }

  /**
   * Enhanced Mouse Movement: Moves from last position to new target.
   * Adds a slight random curve so it's not a robotic straight line.
   */
  async moveMouseToElement(page, selector, steps = 20) {
    const elementHandle = await page.$(selector);
    if (!elementHandle) return;
    
    const box = await elementHandle.boundingBox();
    if (!box) return;

    // Target is the center of the element with a tiny random jitter
    const targetX = box.x + box.width / 2 + (Math.random() * 4 - 2);
    const targetY = box.y + box.height / 2 + (Math.random() * 4 - 2);

    const startX = this.currentMouseX;
    const startY = this.currentMouseY;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Simple linear interpolation with a tiny bit of random wobble
      const x = startX + (targetX - startX) * t + (Math.random() * 2 - 1);
      const y = startY + (targetY - startY) * t + (Math.random() * 2 - 1);
      
      await page.mouse.move(x, y);
      // Minimal delay to make the movement "visible" to recording scripts
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 10)); 
    }

    // Save state for next move
    this.currentMouseX = targetX;
    this.currentMouseY = targetY;
  }

  async clickElement(page, selector, deviceType) {
    const isDesktop = deviceType === "desktop";
    
    // 1. Ensure it's there
    const isVisible = await this.waitForSelectorWithTimeout(page, selector, 5000);
    if (!isVisible) return;

    // 2. Scroll to it
    await this.scrollIntoViewWithOffset(page, selector);

    if (isDesktop) {
      // 3. Move cursor visibly
      await this.moveMouseToElement(page, selector);
      
      // 4. Human hesitation
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 300 + 150)));
      
      // 5. Click
      await page.click(selector);
    } else {
      // Mobile just taps
      await page.tap(selector);
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