// backend/services/apiExecutorService.js
import axios from "axios";
import ApiConfig from "../models/ApiConfig.js";
import { isSafeUrl } from "../utils/ssrfGuard.js";

function kvToObject(arr = []) {
  const out = {};
  for (const item of arr) {
    if (!item?.enabled) continue;
    const k = String(item.key || "").trim();
    if (!k) continue;
    out[k] = String(item.value ?? "");
  }
  return out;
}

function buildAuthHeaders(authType, authConfig = {}) {
  if (authType === "bearer") {
    if (authConfig?.token) return { Authorization: `Bearer ${authConfig.token}` };
  }
  if (authType === "basic") {
    const u = authConfig?.username || "";
    const p = authConfig?.password || "";
    const b64 = Buffer.from(`${u}:${p}`).toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  if (authType === "apiKey") {
  
    if (authConfig?.in === "header" && authConfig?.keyName && authConfig?.keyValue) {
      return { [authConfig.keyName]: String(authConfig.keyValue) };
    }
  }
  return {};
}

function applyAuthQueryParams(authType, authConfig = {}, params = {}) {
  if (authType === "apiKey") {
    if (authConfig?.in === "query" && authConfig?.keyName && authConfig?.keyValue) {
      return { ...params, [authConfig.keyName]: String(authConfig.keyValue) };
    }
  }
  return params;
}

async function requestWithRetry(config, retryCount) {
  let lastErr;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await axios(config);
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      // retry on network errors + 429 + 5xx
      const retryable = !status || status === 429 || (status >= 500 && status <= 599);
      if (!retryable || attempt === retryCount) break;
      const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

/**
 * Execute an API config by id
 * @param {String} apiConfigId
 * @param {Object} runtime - { queryParams, body, headers } (optional)
 */
async function executeApiConfig(apiConfigId, runtime = {}) {
  const cfg = await ApiConfig.findOne({ _id: apiConfigId, isDeleted: false, status: "active" }).lean();
  if (!cfg) throw new Error("API config not found or inactive");

  if (!isSafeUrl(cfg.endpointUrl)) {
    throw new Error("Unsafe endpointUrl blocked by SSRF guard");
  }

  const baseHeaders = kvToObject(cfg.headers);
  const baseParams = kvToObject(cfg.queryParams);

  const authHeaders = buildAuthHeaders(cfg.authType, cfg.authConfig);
  let params = applyAuthQueryParams(cfg.authType, cfg.authConfig, baseParams);

  const headers = { ...baseHeaders, ...authHeaders, ...(runtime.headers || {}) };
  params = { ...params, ...(runtime.queryParams || {}) };

  const axiosConfig = {
    method: cfg.method,
    url: cfg.endpointUrl,
    headers,
    params,
    timeout: cfg.timeout,
    validateStatus: () => true, 
  };

  if (["POST", "PUT", "PATCH", "DELETE"].includes(cfg.method)) {
    axiosConfig.data = runtime.body ?? cfg.bodySchema ?? {};
    if (cfg.bodyType === "json") {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    } else if (cfg.bodyType === "xml") {
      headers["Content-Type"] = headers["Content-Type"] || "application/xml";
    } else if (cfg.bodyType === "raw") {
      headers["Content-Type"] = headers["Content-Type"] || "text/plain";
      if (typeof axiosConfig.data !== "string") axiosConfig.data = String(axiosConfig.data);
    }
  }

  const res = await requestWithRetry(axiosConfig, cfg.retryCount);

  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    data: res.data,
    headers: res.headers,
  };
}

/* ------------------------------------------------------------------ */
/* Lead-based execution (portal "Data Transfer" buttons)               */
/* ------------------------------------------------------------------ */

const STATE_ABBR_TO_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATE_NAME_TO_ABBR = Object.fromEntries(
  Object.entries(STATE_ABBR_TO_NAME).map(([abbr, name]) => [name.toLowerCase(), abbr])
);

function formatState(value, format) {
  const raw = String(value ?? "").trim();
  if (!raw || !format) return raw;
  if (format === "abbr") {
    if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
    return STATE_NAME_TO_ABBR[raw.toLowerCase()] || raw;
  }
  // full
  if (/^[A-Za-z]{2}$/.test(raw)) return STATE_ABBR_TO_NAME[raw.toUpperCase()] || raw;
  return raw;
}

// Builds the system field values available to mappings from a SubmissionLog.
function buildSystemValues(record) {
  const meta = record?.metadata || {};
  const created = record?.createdAt ? new Date(record.createdAt).toISOString() : "";
  return {
    jornaya_lead_id: meta.leadId || "",
    trustedform: meta.trustedForm || "",
    ip_address: meta.ipAddress || "",
    place_id: meta.placeId || "",
    page_url: meta.pageUrl || "",
    device_type: meta.deviceType || "",
    created_date: created,
    original_lead_submit_date: created,
  };
}

// Resolves a SubmissionLog's formData Map/object into a plain object.
function formDataToObject(record) {
  const fd = record?.formData;
  if (!fd) return {};
  if (fd instanceof Map) return Object.fromEntries(fd);
  if (typeof fd.toObject === "function") return fd.toObject();
  return { ...fd };
}

/**
 * Execute an API config for a specific lead (SubmissionLog record). Resolves the
 * configured field mappings (form / system / custom) and returns BOTH the exact
 * request that was sent and the response — so the portal can show the operator
 * precisely what was transmitted.
 */
async function executeApiConfigForLead(cfg, record, customValues = {}) {
  if (!isSafeUrl(cfg.endpointUrl)) {
    throw new Error("Unsafe endpointUrl blocked by SSRF guard");
  }

  const formData = formDataToObject(record);
  const systemValues = buildSystemValues(record);

  const headers = { ...kvToObject(cfg.headers), ...buildAuthHeaders(cfg.authType, cfg.authConfig) };
  let params = applyAuthQueryParams(cfg.authType, cfg.authConfig, kvToObject(cfg.queryParams));
  const body = {};

  const mappings = Array.isArray(cfg.fieldMappings) ? cfg.fieldMappings.filter((m) => m?.enabled !== false && m?.apiKey) : [];

  if (mappings.length) {
    for (const m of mappings) {
      let value = "";
      if (m.source === "form") value = formData[m.sourceKey] ?? "";
      else if (m.source === "system") value = systemValues[m.sourceKey] ?? "";
      else if (m.source === "custom") value = customValues[m.apiKey] ?? "";
      if (m.stateFormat) value = formatState(value, m.stateFormat);
      if (m.location === "query") params[m.apiKey] = String(value ?? "");
      else body[m.apiKey] = value;
    }
  } else {
    // No explicit mapping configured yet: send the raw form data + key system
    // fields so the button is still useful and shows what would be transmitted.
    Object.assign(body, formData, {
      jornaya_lead_id: systemValues.jornaya_lead_id,
      trustedform: systemValues.trustedform,
      ip_address: systemValues.ip_address,
    });
  }

  // Custom fields the agent entered at runtime (those not already mapped).
  for (const cf of cfg.customFields || []) {
    if (!cf?.key) continue;
    if (Object.prototype.hasOwnProperty.call(customValues, cf.key)) {
      const val = customValues[cf.key];
      if (cf.location === "query") params[cf.key] = String(val ?? "");
      else body[cf.key] = val;
    }
  }

  const hasBody = ["POST", "PUT", "PATCH", "DELETE"].includes(cfg.method);
  if (hasBody && cfg.bodyType === "json") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const axiosConfig = {
    method: cfg.method,
    url: cfg.endpointUrl,
    headers,
    params,
    data: hasBody ? body : undefined,
    timeout: cfg.timeout,
    validateStatus: () => true,
  };

  const startedAt = Date.now();
  const res = await requestWithRetry(axiosConfig, cfg.retryCount);
  const timeMs = Date.now() - startedAt;

  return {
    request: {
      method: cfg.method,
      url: cfg.endpointUrl,
      headers,
      params,
      body: hasBody ? body : null,
    },
    response: {
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      data: res.data,
      headers: res.headers,
      timeMs,
    },
  };
}

export { executeApiConfig, executeApiConfigForLead, buildSystemValues };