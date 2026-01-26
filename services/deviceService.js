// backend/services/deviceService.js
const devices = {
  desktop: [
    {
      deviceType: "desktop",
      name: "Desktop Chrome",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      viewport: { width: 1366, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    },
  ],
  tablet: [
    {
      deviceType: "tablet",
      name: "iPad",
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 810, height: 1080, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
  ],
  mobile: [
    {
      deviceType: "mobile",
      name: "iPhone 7",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14E5239e Safari/602.1",
      viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
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
