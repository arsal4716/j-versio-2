// backend/services/proxyService.js
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ValidationError, BrowserError } from "../utils/errorTypes.js";
import logger from "../utils/logger.js";

const zipCodePorts = [
  10002, 10003, 10004, 10005, 10006, 10007, 10008, 10009, 10010, 10011, 10012,
  10013, 10014, 10015, 10016, 10017, 10018, 10019, 10020, 10021, 10022, 10023,
  10024, 10025, 10026, 10027, 10028, 10029, 10030,
];

let lastPortIndex = 0;
const portUsageMap = new Map();
const PORT_TIMEOUT = 240000;
function getNextPort() {
  const now = Date.now();
  let attempts = 0;

  while (attempts < zipCodePorts.length) {
    const port = zipCodePorts[lastPortIndex];
    lastPortIndex = (lastPortIndex + 1) % zipCodePorts.length;

    const lastUsed = portUsageMap.get(port) || 0;
    if (now - lastUsed >= PORT_TIMEOUT) {
      portUsageMap.set(port, now);
      return port;
    }
    attempts++;
  }

  throw new BrowserError("All proxy ports are in use. Try again in a moment.");
}

function normalizeProvider(p) {
  const v = (p || "").toLowerCase().trim();
  if (!v) return "";
  if (v === "decodo" || v === "deco" || v === "oxylabs-decodo") return "decodo";
  if (v === "smartproxy" || v === "smart proxy") return "smartproxy";
  return v;
}

function normalizeType(t) {
  const v = (t || "").toLowerCase().trim();
  if (!v) return "zip";
  if (v === "zipcode" || v === "txtzip") return "zip";
  if (v === "auto") return "auto";
  if (v === "state") return "state";
  return v;
}

function getDecodoIpCheckUrl() {
  return "https://ip.decodo.com/json";
}

async function verifyProxyIp(proxyUrl, ipCheckUrl) {
  const agent = new HttpsProxyAgent(proxyUrl);
  const res = await axios.get(ipCheckUrl, {
    httpsAgent: agent,
    timeout: 20000,
  });
  return res?.data?.proxy?.ip ? res.data.proxy.ip : null;
}

const statePortMapping = {
  Alabama: 17001,
  Alaska: 17101,
  Arizona: 17201,
  Arkansas: 17301,
  California: 10001,
  Colorado: 17401,
  Connecticut: 17501,
  Delaware: 17601,
  Florida: 11001,
  "Georgia (US)": 17701,
  Hawaii: 17801,
  Idaho: 17901,
  Illinois: 12001,
  Indiana: 18001,
  Iowa: 18101,
  Kansas: 18201,
  Kentucky: 18301,
  Louisiana: 18401,
  Maine: 18501,
  Maryland: 18601,
  Massachusetts: 18701,
  Michigan: 18801,
  Minnesota: 18901,
  Mississippi: 19001,
  Missouri: 19101,
  Montana: 19201,
  Nebraska: 19301,
  Nevada: 19401,
  "New Hampshire": 19501,
  "New Jersey": 19601,
  "New Mexico": 19701,
  "New York": 13001,
  "North Carolina": 19801,
  "North Dakota": 19901,
  Ohio: 20001,
  Oklahoma: 20101,
  Oregon: 20201,
  Pennsylvania: 20301,
  "Rhode Island": 20401,
  "South Carolina": 20501,
  "South Dakota": 20601,
  Tennessee: 20701,
  Texas: 14001,
  Utah: 20801,
  Vermont: 20901,
  Virginia: 15001,
  Washington: 16001,
  "West Virginia": 21001,
  Wisconsin: 21101,
  Wyoming: 21201,
};

const stateAbbrevToName = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia (US)",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

function extractZipCode(formData) {
  const z =
    formData?.zipCode ??
    formData?.txtzip ??
    formData?.zipcode ??
    formData?.zip ??
    formData?.Zip ??
    formData?.ZIP;

  if (typeof z === "string" && /^\d{5}$/.test(z.trim())) return z.trim();
  if (typeof z === "number" && /^\d{5}$/.test(String(z))) return String(z);

  for (const key in formData || {}) {
    const value = formData[key];
    if (typeof value === "string" && /^\d{5}$/.test(value.trim())) {
      return value.trim();
    }
  }
  return null;
}

function normalizeStateName(input) {
  if (!input) return null;

  const raw = String(input).trim();
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const name = stateAbbrevToName[raw.toUpperCase()];
    return name || null;
  }

  if (Object.prototype.hasOwnProperty.call(statePortMapping, raw)) return raw;

  const ci = Object.keys(statePortMapping).find(
    (k) => k.toLowerCase() === raw.toLowerCase(),
  );
  return ci || null;
}

function extractState(formData) {
  const st =
    formData?.state ??
    formData?.State ??
    formData?.txtState ??
    formData?.stateName ??
    formData?.state_code ??
    formData?.["wpforms-2715-field_8"];

  return normalizeStateName(st);
}

class ProxyService {
  async getProxyForCenter(center, formData) {
    const proxy = center?.proxy || {};
    const provider = normalizeProvider(proxy.provider);
    const type = normalizeType(proxy.type);

    if (!provider) {
      throw new ValidationError(
        "Center proxy configuration is missing (provider)",
      );
    }

    const usernameBase = proxy.username;
    const password = proxy.password;

    if (!usernameBase || !password) {
      throw new ValidationError(
        "Proxy username/password missing in center settings",
      );
    }

    logger.info("Proxy selection started", {
      centerId: center?._id?.toString?.() || center?._id,
      provider,
      type,
    });

    if (provider !== "decodo") {
      throw new ValidationError(
        `Unsupported proxy provider: "${provider}". Expected "decodo".`,
      );
    }

    const ipCheckUrl = getDecodoIpCheckUrl();
    const zipCode = extractZipCode(formData);

    // ---------------- ZIP MODE (or AUTO) ----------------
    if (type === "zip" || type === "auto") {
      if (zipCode) {
        try {
          const port = getNextPort();
          const proxyUsername = `user-${usernameBase}-sessionduration-2-country-us-zip-${zipCode}`;
          const proxyHost = `us.decodo.com:${port}`;
          const fullProxyUrl = `http://${proxyUsername}:${password}@${proxyHost}`;

          logger.info("Trying ZIP proxy", {
            zipCode,
            port,
            proxyHost,
            usernameSample: proxyUsername.slice(0, 20) + "***",
          });

          const ip = await verifyProxyIp(fullProxyUrl, ipCheckUrl);

          if (!ip)
            throw new Error("Proxy verification failed (no IP returned)");

          logger.info("ZIP proxy verified", { ip, zipCode, port });

          return {
            proxyUrl: `http://${proxyHost}`, // host only, browserService uses separate creds
            username: proxyUsername,
            password,
            ip,
            mode: "zip",
            zipCode,
          };
        } catch (e) {
          logger.warn("ZIP proxy failed, falling back to state proxy", {
            zipCode,
            error: e?.message,
          });
        }
      } else {
        logger.warn("ZIP not provided, switching to state proxy fallback");
      }
    }

    // ---------------- STATE FALLBACK ----------------
    const stateName = extractState(formData);
    if (!stateName) {
      throw new ValidationError(
        "ZIP proxy failed (or missing) and state is missing/invalid. Please submit a valid US state.",
      );
    }

    const statePort = statePortMapping[stateName];
    if (!statePort) {
      throw new ValidationError(
        `State proxy port not found for "${stateName}"`,
      );
    }

    const proxyHost = `state.decodo.com:${statePort}`;

    // IMPORTANT:
    // Your OLD working state verification used plain username (no "user-" and no targeting).
    // Because the PORT selects the state on state.decodo.com.
    const usernameCandidates = [
      `${usernameBase}`, // ✅ old working style
      `user-${usernameBase}`, // sometimes required
      `user-${usernameBase}-country-us-state-${stateName}`, // keep as last fallback
    ];

    let lastErr = null;

    for (const u of usernameCandidates) {
      try {
        const fullProxyUrl = `http://${u}:${password}@${proxyHost}`;

        logger.info("Trying STATE proxy (candidate)", {
          stateName,
          statePort,
          proxyHost,
          usernameSample: u.slice(0, 18) + "***",
        });

        const ip = await verifyProxyIp(fullProxyUrl, ipCheckUrl);

        if (!ip) throw new Error("Proxy verification failed (no IP returned)");

        logger.info("STATE proxy verified", { ip, stateName, usedUsername: u });

        return {
          proxyUrl: `http://${proxyHost}`,
          username: u,
          password,
          ip,
          mode: "state",
          state: stateName,
          statePort,
        };
      } catch (e) {
        lastErr = e;
        logger.warn("STATE proxy candidate failed", {
          stateName,
          userTried: u,
          error: e?.message,
        });
      }
    }

    throw new BrowserError(
      `No available proxy found. ZIP failed and state proxy failed for "${stateName}". ` +
        `Last error: ${lastErr?.message || "Unknown"}`,
    );
  }
}

export default new ProxyService();
