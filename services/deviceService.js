// backend/services/deviceService.js
const devices = {
  desktop: [
    {
      deviceType: "desktop",
      name: "Windows 11 Chrome",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    },
    {
      deviceType: "desktop",
      name: "Windows 11 Edge",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      viewport: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    },
    {
      deviceType: "desktop",
      name: "macOS Safari",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      viewport: { width: 1512, height: 982, deviceScaleFactor: 2, isMobile: false, hasTouch: false }, // MacBook Pro 14"
    },
    {
      deviceType: "desktop",
      name: "macOS Chrome",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
    },
    
  ],

  tablet: [
    // iPad Pro 12.9" (iPadOS 17) – Safari
    {
      deviceType: "tablet",
      name: "iPad Pro 12.9",
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "tablet",
      name: "iPad Air",
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "tablet",
      name: "Galaxy Tab S9",
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-X716B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 800, height: 1280, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "tablet",
      name: "Surface Pro",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Surface) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1.5, isMobile: false, hasTouch: true },
    },
  ],

  mobile: [
    {
      deviceType: "mobile",
      name: "iPhone 15 Pro",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "mobile",
      name: "iPhone 15",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "mobile",
      name: "Galaxy S23 Ultra",
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: { width: 360, height: 780, deviceScaleFactor: 4, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "mobile",
      name: "Galaxy S23",
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: { width: 360, height: 780, deviceScaleFactor: 4, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "mobile",
      name: "Pixel 8",
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: { width: 392, height: 824, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
    },
    {
      deviceType: "mobile",
      name: "OnePlus 11",
      userAgent:
        "Mozilla/5.0 (Linux; Android 13; CPH2449) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      viewport: { width: 360, height: 740, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    },
  ],
};
function pickWeighted(distribution) {
  const d = distribution || { desktop: 60, tablet: 20, mobile: 20 };
  const desktop = Number(d.desktop ?? 60);
  const tablet = Number(d.tablet ?? 20);
  const mobile = Number(d.mobile ?? 20);

  const total = desktop + tablet + mobile;
  const r = Math.random() * total;

  if (r < desktop) return "desktop";
  if (r < desktop + tablet) return "tablet";
  return "mobile";
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class DeviceService {
  selectDeviceBasedOnDistribution(distribution) {
    const type = pickWeighted(distribution);
    return randomFrom(devices[type] || devices.desktop);
  }
}

export default new DeviceService();