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
  async launchBrowserWithProxy({
    proxyUrl,
    proxyUsername,
    proxyPassword,
    referrers,
  }) {
    const { width, height } = getRandomWindowSize();
    let browser;

    browser = await puppeteer.launch({
        executablePath: "/usr/bin/chromium-browser", 
      args: [
        `--proxy-server=${proxyUrl}`,
        `--no-proxy-server-bypass`,
        "--disable-ipv6",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--ignore-certificate-errors",
        "--disable-ipv6",
        "--disable-infobars",
        "--disable-blink-features=AutomationControlled",
        "--enable-automation",
        "--disable-extensions",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--disable-plugins",
        "--disable-software-rasterizer",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        `--window-size=${width},${height}`,
      ],
      headless: "new",
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    if (proxyUsername && proxyPassword) {
      await page.authenticate({
        username: proxyUsername,
        password: proxyPassword,
      });
    }

    const refList =
      Array.isArray(referrers) && referrers.length
        ? referrers
        : DEFAULT_REFERRERS;
    const selectedReferer = getRandomElement(refList);

    await page.setExtraHTTPHeaders({ referer: selectedReferer });

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const headers = request.headers();
      headers["referer"] = selectedReferer;
      request.continue({ headers });
    });

    logger.debug("Browser launched with proxy + referer", {
      proxyUrl,
      referer: selectedReferer,
    });

    return { browser, page };
  }

  async emulateDevice(page, device) {
    if (!device) return;
    if (device.userAgent) await page.setUserAgent(device.userAgent);
    if (device.viewport) await page.setViewport(device.viewport);
  }

  async waitForSelectorWithTimeout(page, selector, timeoutMs = 5000) {
    try {
      await page.waitForSelector(selector, {
        visible: true,
        timeout: timeoutMs,
      });
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

  async closeBrowser(browser) {
    try {
      if (browser) await browser.close();
    } catch (e) {
      logger.warn("Browser close failed", { error: e?.message });
    }
  }
}

export default new BrowserService();
