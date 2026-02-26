// backend/services/apiExecutorService.js
const axios = require("axios");
const ApiConfig = require("../models/ApiConfig");
const { isSafeUrl } = require("../utils/ssrfGuard");

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

module.exports = { executeApiConfig };