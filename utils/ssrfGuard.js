
function isSafeUrl(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;

    const host = (u.hostname || "").toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) return false;
    if (host === "127.0.0.1" || host === "0.0.0.0") return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      if (host.startsWith("10.")) return false;
      if (host.startsWith("192.168.")) return false;
      const parts = host.split(".").map(Number);
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    }

    return true;
  } catch {
    return false;
  }
}

module.exports = { isSafeUrl };