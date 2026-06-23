import Center from "../models/Center.js";
import FormSetup from "../models/FormSetup.js";
import SubmissionLog from "../models/SubmissionLog.js";

import proxyService from "./proxyService.js";
import browserService from "./browserService.js";
import sheetService from "./sheetService.js";
import deviceService from "./deviceService.js";
import dncService from "./dncService.js";
import settingsService from "./settingsService.js";
import { acquireProxySlot } from "../utils/proxyConcurrency.js";
import { audit } from "./auditService.js";
import TypingHelper from "../helper/typingHelper.js";

import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  BrowserError,
} from "../utils/errorTypes.js";

import logger from "../utils/logger.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function makeFallbackLeadId() {
  const ts = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `fallback_${ts}_${r}`;
}

// Industry-standard ids for the hidden tracking fields on a lander. A campaign
// can override any of these in FormSetup.captureSelectors when its lander differs.
const DEFAULT_CAPTURE = {
  leadId: "#leadid_token",
  tfCert: "#xxTrustedFormCertUrl_0",
  tfToken: "#xxTrustedFormToken_0",
  tfPing: "#xxTrustedFormPingUrl_0",
  userIp: "#user_ip",
};

// Page-load + warm-up timing (env-tunable so speed can be adjusted without a
// code change). Default to domcontentloaded — the lander HTML/CSS is ready but
// we don't block on every image/3rd-party pixel, cutting many seconds before
// typing starts. Hidden tracking fields are still captured later (after the
// stay-open window), so a faster initial load does not lose the cert/leadid.
const LANDER_WAIT_UNTIL = process.env.LANDER_WAIT_UNTIL || "domcontentloaded";
const LANDER_NAV_TIMEOUT = Number(process.env.LANDER_NAV_TIMEOUT_MS || 90000);
const WARMUP_MIN_MS = Number(process.env.LANDER_WARMUP_MIN_MS || 2000);
const WARMUP_MAX_MS = Number(process.env.LANDER_WARMUP_MAX_MS || 4000);

class SubmissionService {
  async submitForm(centerId, campaignName, formData, user) {
    let submissionLog = null;
    let browser = null;
    let page = null;
    let device = null;
    let releaseProxySlot = null;

    try {
      await this.validateUserAccess(user, centerId, campaignName);

      const { center, campaign } = await this.getCenterAndCampaign(centerId, campaignName);
      const formSetup = await this.getFormSetup(centerId, campaignName);

      submissionLog = await this.createSubmissionLog(centerId, campaignName, formData, user);

      // Activity log: a submission has started (visible on the super-admin Logs
      // page, auto-expires after 24h). Fire-and-forget; never blocks the run.
      audit({
        actor: user,
        centerId,
        action: "submission.start",
        entity: "Submission",
        entityId: submissionLog?._id,
        message: `Submission started — ${campaignName}`,
        details: {
          campaignName,
          zip: formData?.zip || formData?.txtZip || formData?.zipCode || "",
          phone: formData?.phone || formData?.txtPhone || "",
        },
      });

      // DNC enforcement (defense-in-depth; the form page also checks in real time).
      // A confirmed list hit blocks the automation unless the agent explicitly
      // overrode it at submit time.
      await this.enforceDnc(centerId, campaignName, formData);

      // Reserve a proxy slot for this center (each center has its own Decodo
      // account/thread limit). Held until the browser closes so the sticky IP is
      // counted for the whole submission. Throws a retryable error when the
      // center is at capacity, so BullMQ re-queues with backoff.
      releaseProxySlot = await acquireProxySlot(centerId, center?.proxy?.maxConcurrency || undefined);

      const proxyConfig = await proxyService.getProxyForCenter(center, formData);

      // Effective settings honour the hierarchy: campaign override → center
      // default → schema defaults. We map them onto the automation inputs but
      // always fall back to the Center's base settings so existing behaviour is
      // preserved when the panel is left at defaults.
      const eff = await this.getEffectiveCustomization(centerId, campaignName);

      // Select device (panel device mix wins when configured; else center base)
      device = deviceService.selectDeviceBasedOnDistribution(
        eff.deviceDistribution || center?.settings?.deviceDistribution
      );

      // Launch Browser
      ({ browser, page } = await browserService.launchBrowserWithProxy({
        proxyUrl: proxyConfig.proxyUrl,
        proxyUsername: proxyConfig.username,
        proxyPassword: proxyConfig.password,
        referrers: eff.referrers || center?.settings?.referrers,
        device,
      }));

      // Resolve this campaign's tracking-field selectors (campaign override →
      // industry-standard default).
      const captureSel = this.resolveCaptureSelectors(formSetup);

      await browserService.emulateDevice(page, device);
      await this.navigateToLander(page, formSetup.landerUrl);

      // --- WARM-UP DELAY (tunable; default 2-4s) ---
      const warmUp = randInt(WARMUP_MIN_MS, WARMUP_MAX_MS);
      await sleep(warmUp);

      await this.injectIpAddresses(page, proxyConfig.ip);
      await this.setupTrustedFormListener(page, captureSel);

      // Typing speed randomization
      const typingSpeed = this.getRandomTypingSpeed(center?.settings?.typingSpeed);
      const typingHelper = new TypingHelper(typingSpeed, {
        makeMistakesProbability: eff.randomTypingMistakes ? 0.3 : 0,
        fieldPause: { min: 1000, max: 3000 },
      });

      // --- REQUIREMENT 2: HUMANIZED FILLING ---
      await this.fillFormFields(page, formSetup.fields, formData, typingHelper, device.deviceType);

      // Consent Check
      // IMPORTANT: if consentSelector empty => no checkbox => skip
      let consentSelector = (formSetup?.consentSelector || "").trim();
      if (consentSelector && !consentSelector.startsWith("#") && !consentSelector.startsWith(".")) {
        consentSelector = `#${consentSelector}`;
      }

      if (consentSelector && formData?.consent) {
        await this.checkConsentCheckbox(page, consentSelector, device.deviceType);
      }

      // Pre-submit captures
      const leadId = await this.getLeadId(page, captureSel.leadId);
      const ipAddress = await this.getUserIp(page, captureSel.userIp);
      const placeId = await this.getPlaceId(page, formData);

      // Prepare Submit
      let submitSelector = (formSetup?.submitButtonSelector || "").trim();
      if (!submitSelector.startsWith("#") && !submitSelector.startsWith(".")) {
        submitSelector = `#${submitSelector}`;
      }

      // --- REQUIREMENT 3: SUBMIT TRACKER + HARD STAY OPEN ---
      // 1) Click submit (NO navigation/network idle waits)
      await this.clickSubmitButton(page, submitSelector, device.deviceType);

      // 2) Start stayOpen timer IMMEDIATELY after click
      const stayOpenSeconds = Math.max(Number(center?.settings?.stayOpenTime) || 9, 9);
      logger.info(`Submit clicked. Locking browser open for ${stayOpenSeconds}s...`);
      await sleep(stayOpenSeconds * 1000);

      // 3) Capture after stayOpen window
      const finalPageUrl = page.url();
      const trustedFormData = await this.getTrustedFormData(page, captureSel);

      const submissionResult = {
        ...formData,
        leadId,
        placeId,
        trustedForm: trustedFormData?.cert || "",
        trustedFormToken: trustedFormData?.token || "",
        trustedFormPing: trustedFormData?.ping || "",
        ipAddress,
        proxyIp: proxyConfig.ip,
        pageUrl: finalPageUrl,
        deviceType: device.deviceType,
        userAgent: device.userAgent,
      };

      // Save to Sheets (after stayOpen; keep your behavior)
      const sheetResults = await sheetService.saveSubmissionToSheets(
        center,
        campaign,
        submissionResult,
        formSetup,
      );

      await this.updateSubmissionLogSuccess(submissionLog, submissionResult, sheetResults);

      audit({
        actor: user,
        centerId,
        action: "submission.success",
        entity: "Submission",
        entityId: submissionLog?._id,
        message: `Lead submitted — ${campaignName}`,
        details: {
          campaignName,
          leadId: leadId || "",
          proxyIp: proxyConfig?.ip || "",
        },
      });

      return this.formatSuccessResponse(submissionResult, sheetResults, eff?.onformPopup);
    } catch (error) {
      logger.error("Form submission failed", { error: error.message });
      if (submissionLog) await this.updateSubmissionLogFailure(submissionLog, error);

      audit({
        actor: user,
        centerId,
        action: "submission.failed",
        entity: "Submission",
        entityId: submissionLog?._id,
        message: `Submission failed — ${error.message}`,
        details: { campaignName, error: error.message, code: error.code || "" },
      });

      throw error;
    } finally {
      await browserService.closeBrowser(browser);
      // Free the center's proxy slot so the next queued submission can run.
      if (releaseProxySlot) {
        try {
          await releaseProxySlot();
        } catch (e) {
          logger.warn("Failed to release proxy slot", { error: e?.message });
        }
      }
    }
  }

  // Reads the effective (campaign→center→default) panel settings and maps the
  // pieces the automation consumes. Every field falls back to undefined so the
  // caller can use the Center's base settings when nothing is configured.
  async getEffectiveCustomization(centerId, campaignName) {
    try {
      const eff = await settingsService.getEffectiveSettings(centerId, campaignName);
      const c = eff?.customization || {};

      let deviceDistribution;
      const d = c.devices;
      if (d) {
        const mapped = {
          desktop: d.desktop?.enabled ? Number(d.desktop.percentage) || 0 : 0,
          tablet: d.tablet?.enabled ? Number(d.tablet.percentage) || 0 : 0,
          mobile: d.mobile?.enabled ? Number(d.mobile.percentage) || 0 : 0,
        };
        if (mapped.desktop + mapped.tablet + mapped.mobile > 0) deviceDistribution = mapped;
      }

      let referrers;
      if (c.referers?.enabled && Array.isArray(c.referers.links) && c.referers.links.length) {
        referrers = c.referers.links;
      }

      return {
        deviceDistribution,
        referrers,
        randomTypingMistakes: c.typing?.randomTypingMistakes !== false,
        onformPopup: c.onformPopup || {},
      };
    } catch (e) {
      logger.warn("Failed to resolve effective settings; using center defaults", {
        error: e?.message,
      });
      return { randomTypingMistakes: true, onformPopup: {} };
    }
  }

  getRandomTypingSpeed(centerTypingSpeed) {
    if (centerTypingSpeed && typeof centerTypingSpeed === "number") {
      const min = Math.max(centerTypingSpeed - 200, 300);
      const max = centerTypingSpeed + 200;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.floor(Math.random() * (1200 - 600 + 1)) + 600;
  }

  validateUserAccess(user, centerId, campaignName) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isSuperAdmin = roles.includes("super_admin");
    if (isSuperAdmin) return;

    if (user?.centerId?.toString() !== centerId?.toString()) {
      throw new AuthorizationError("You do not have access to this center");
    }

    if (!user?.allowedCampaigns?.includes(campaignName)) {
      throw new AuthorizationError("You do not have permission for this campaign");
    }
  }

  // Resolves the phone from the submitted form data and runs the configured DNC
  // checks. Throws if the number is listed and the agent did not override.
  async enforceDnc(centerId, campaignName, formData) {
    const override =
      formData?.dncOverride === true ||
      formData?.dncOverride === "true" ||
      formData?._dncOverride === true;
    if (override) return;

    const rawPhone =
      formData?.phone ||
      formData?.phoneNumber ||
      Object.entries(formData || {}).find(([k]) => /phone/i.test(k))?.[1];

    if (!rawPhone) return;

    const result = await dncService.checkPhone({
      centerId,
      campaignName,
      phone: rawPhone,
    });

    if (result.blocked) {
      const failed = result.checks.filter((c) => c.listed).map((c) => c.label).join(", ");
      throw new ValidationError(
        `Submission blocked: phone number is listed (${failed}). Agent override required.`
      );
    }
  }

  async getCenterAndCampaign(centerId, campaignName) {
    const center = await Center.findById(centerId).lean();
    if (!center) throw new NotFoundError("Center not found");

    const campaign = (center.campaigns || []).find(
      (c) => c.name === campaignName && c.isActive === true,
    );
    if (!campaign) throw new NotFoundError("Campaign not found or inactive");

    return { center, campaign };
  }

  async getFormSetup(centerId, campaignName) {
    const formSetup = await FormSetup.findOne({ centerId, campaignName }).lean();
    if (!formSetup) throw new NotFoundError("Form configuration not found for this campaign");

    if (!Array.isArray(formSetup.fields) || formSetup.fields.length === 0) {
      throw new ValidationError("No form fields configured for this campaign");
    }

    if (!formSetup.landerUrl) {
      throw new ValidationError("Lander URL is missing in FormSetup");
    }

    return formSetup;
  }

  async createSubmissionLog(centerId, campaignName, formData, user) {
    const submissionLog = new SubmissionLog({
      centerId,
      campaignName,
      userId: user._id,
      formData: new Map(Object.entries(formData || {})),
      timestamps: { startedAt: new Date() },
      result: "pending",
    });

    await submissionLog.save();
    return submissionLog;
  }

  async navigateToLander(page, url) {
    try {
      await page.goto(url, { waitUntil: LANDER_WAIT_UNTIL, timeout: LANDER_NAV_TIMEOUT });
      logger.debug("Navigated to lander", { url, waitUntil: LANDER_WAIT_UNTIL });
    } catch (error) {
      throw new BrowserError(`Failed to navigate to lander: ${error.message}`);
    }
  }

  // Merge the campaign's configured capture selectors with the standard
  // defaults. Bare ids (no #/./[) are treated as element ids.
  resolveCaptureSelectors(formSetup) {
    const cs = formSetup?.captureSelectors || {};
    const norm = (v, d) => {
      const s = String(v ?? "").trim() || d;
      return /^[#.\[]/.test(s) ? s : `#${s}`;
    };
    return {
      leadId: norm(cs.leadId, DEFAULT_CAPTURE.leadId),
      tfCert: norm(cs.tfCert, DEFAULT_CAPTURE.tfCert),
      tfToken: norm(cs.tfToken, DEFAULT_CAPTURE.tfToken),
      tfPing: norm(cs.tfPing, DEFAULT_CAPTURE.tfPing),
      userIp: norm(cs.userIp, DEFAULT_CAPTURE.userIp),
    };
  }

  async injectIpAddresses(page, proxyIp) {
    await page.evaluate((ip) => {
      window.trustedFormIp = ip;
      window.jornayaIp = ip;
    }, proxyIp);
  }

  async setupTrustedFormListener(page, sel = {}) {
    const selectors = {
      cert: sel.tfCert || DEFAULT_CAPTURE.tfCert,
      token: sel.tfToken || DEFAULT_CAPTURE.tfToken,
      ping: sel.tfPing || DEFAULT_CAPTURE.tfPing,
    };
    await page.evaluate((s) => {
      window._trustedFormData = null;

      const captureTF = () => {
        const cert = document.querySelector(s.cert)?.value || "";
        const token = document.querySelector(s.token)?.value || "";
        const ping = document.querySelector(s.ping)?.value || "";
        // The cert URL is the value that matters and the one most landers expose;
        // token/ping are optional and frequently absent or populated later. Lock
        // in the data as soon as the cert is present, keeping whatever token/ping
        // exist at that moment.
        if (cert) {
          window._trustedFormData = { cert, token, ping };
          return true;
        }
        return false;
      };

      if (captureTF()) return;

      const observer = new MutationObserver(() => {
        if (captureTF()) observer.disconnect();
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 6000);
    }, selectors);
  }

  async fillFormFields(page, fields, formData, typingHelper, deviceType) {
    const isDesktop = deviceType === "desktop";

    for (const field of fields) {
      let selector = field?.selector;
      const name = field?.name;

      if (!selector || !name) continue;
      selector = selector.trim();
      if (!selector.startsWith("#") && !selector.startsWith(".")) {
        selector = `#${selector}`;
      }

      const value =
        (formData?.[name] !== undefined ? String(formData[name]) : "") ||
        (field?.defaultValue ? String(field.defaultValue) : "");

      if (field?.required && (!value || value.trim() === "")) {
        throw new ValidationError(`${field?.label || name} is required`);
      }

      try {
        const isVisible = await browserService.waitForSelectorWithTimeout(page, selector, 7000);
        if (!isVisible) {
          logger.warn("Field not visible, skipping", { name, selector });
          continue;
        }

        await browserService.scrollIntoViewWithOffset(page, selector);

        if (isDesktop) {
          await browserService.moveMouseToElement(page, selector);
          await sleep(randInt(90, 220));

          await browserService.clickElement(page, selector, deviceType, {
            purpose: "generic",
            hoverDelayMs: randInt(80, 220),
            microAdjust: true,
            timeoutMs: 7000,
          });
        } else {
          await page.tap(selector);
        }

        await sleep(randInt(250, 650));
        await typingHelper.simulateTyping(page, selector, value);

        logger.debug("Field filled", {
          name,
          selector,
          valueLength: value.length,
          deviceType,
        });
      } catch (error) {
        logger.error("Error filling field", { name, selector, error: error.message });
        throw new BrowserError(
          `Failed to fill field ${field?.label || name} (${selector}): ${error.message}`,
        );
      }
    }
  }


  async checkConsentCheckbox(page, selector, deviceType) {
    try {
      await browserService.clickElement(page, selector, deviceType, {
        purpose: "checkbox",
        hoverDelayMs: randInt(200, 800),
        microAdjust: true,
        timeoutMs: 8000,
      });

      const isChecked = await page.evaluate((sel) => {
        const checkbox = document.querySelector(sel);
        return checkbox ? checkbox.checked : false;
      }, selector);

      if (!isChecked) throw new Error("Consent checkbox could not be checked");

      await sleep(randInt(250, 700));
    } catch (error) {
      throw new BrowserError(`Consent checkbox error: ${error.message}`);
    }
  }

  async getLeadId(page, selector = DEFAULT_CAPTURE.leadId) {
    try {
      const v = await browserService.getFieldValue(page, selector || DEFAULT_CAPTURE.leadId);
      return (v || "").trim();
    } catch {
      return "";
    }
  }

  // Place ID: prefer an explicit submitted value (form field placeId/place_id/
  // cid), otherwise read a conventional hidden field from the lander.
  async getPlaceId(page, formData) {
    const fromForm =
      formData?.placeId ?? formData?.place_id ?? formData?.cid ?? formData?.CID;
    if (fromForm) return String(fromForm).trim();
    for (const sel of ["#place_id", "#placeId", "#cid"]) {
      try {
        const v = await browserService.getFieldValue(page, sel);
        if (v && String(v).trim()) return String(v).trim();
      } catch {
        /* try next */
      }
    }
    return "";
  }

  async getUserIp(page, selector = DEFAULT_CAPTURE.userIp) {
    try {
      const v = await browserService.getFieldValue(page, selector || DEFAULT_CAPTURE.userIp);
      return (v || "").trim();
    } catch {
      return "";
    }
  }

  async getTrustedFormData(page, sel = {}) {
    const tfData = await page.evaluate(() => window._trustedFormData).catch(() => null);
    if (tfData) return tfData;

    const certSel = sel.tfCert || DEFAULT_CAPTURE.tfCert;
    const tokenSel = sel.tfToken || DEFAULT_CAPTURE.tfToken;
    const pingSel = sel.tfPing || DEFAULT_CAPTURE.tfPing;
    return {
      cert: (await browserService.getFieldValue(page, certSel).catch(() => "")) || "",
      token: (await browserService.getFieldValue(page, tokenSel).catch(() => "")) || "",
      ping: (await browserService.getFieldValue(page, pingSel).catch(() => "")) || "",
    };
  }
  async clickSubmitButton(page, submitSelector, deviceType) {
    await browserService.scrollIntoViewWithOffset(page, submitSelector);

    if (deviceType === "desktop") {
      await browserService.clickElement(page, submitSelector, deviceType, {
        purpose: "submit",
        hoverDelayMs: randInt(180, 650),
        microAdjust: true,
        timeoutMs: 8000,
      });
    } else {
      await page.tap(submitSelector);
      await sleep(randInt(150, 380));
    }

    await sleep(randInt(300, 700));
  }

  async updateSubmissionLogSuccess(submissionLog, submissionResult, sheetResults) {
    const completedAt = new Date();
    const duration = completedAt - submissionLog.timestamps.startedAt;

    submissionLog.result = "success";

    const leadId = (submissionResult.leadId || "").trim();

    const leadIdForDb = leadId ? leadId : makeFallbackLeadId();

    submissionLog.metadata = {
      ...(leadIdForDb ? { leadId: leadIdForDb } : {}),
      ...(submissionResult.placeId ? { placeId: submissionResult.placeId } : {}),
      trustedForm: submissionResult.trustedForm,
      trustedFormToken: submissionResult.trustedFormToken,
      trustedFormPing: submissionResult.trustedFormPing,
      ipAddress: submissionResult.ipAddress,
      proxyIp: submissionResult.proxyIp,
      pageUrl: submissionResult.pageUrl,
      userAgent: submissionResult.userAgent,
      deviceType: submissionResult.deviceType,
      referer: "dynamic",
      leadIdWasMissing: !leadId,
    };

    submissionLog.timestamps.completedAt = completedAt;
    submissionLog.timestamps.duration = duration;

    submissionLog.sheetStatus = {
      master: sheetResults?.master?.success || false,
      admin: sheetResults?.admin?.success || false,
      errors: [
        ...(sheetResults?.master?.error ? [sheetResults.master.error] : []),
        ...(sheetResults?.admin?.error ? [sheetResults.admin.error] : []),
      ],
    };

    await submissionLog.save();
  }

  async updateSubmissionLogFailure(submissionLog, error) {
    submissionLog.result = "failed";
    submissionLog.errorDetails = {
      message: error.message,
      code: error.code || "UNKNOWN_ERROR",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
    submissionLog.timestamps.completedAt = new Date();
    submissionLog.timestamps.duration =
      submissionLog.timestamps.completedAt - submissionLog.timestamps.startedAt;

    await submissionLog.save();
  }

  formatSuccessResponse(submissionResult, sheetResults, onformPopup) {
    // Which captured values the on-form result popup is allowed to display, per
    // the campaign/center "Onform Popup" toggles. Undefined keys fall back to
    // the SettingsConfig schema defaults (ip/leadId/api shown, trustedform hidden).
    const op = onformPopup || {};
    const display = {
      ipAddress: op.ipAddress !== false,
      leadId: op.leadId !== false,
      trustedform: op.trustedform === true,
      apiResponse: op.apiResponse !== false,
    };

    return {
      success: true,
      message: "Form submitted successfully",
      data: {
        leadId: submissionResult.leadId,
        placeId: submissionResult.placeId,
        trustedForm: submissionResult.trustedForm,
        ipAddress: submissionResult.ipAddress,
        proxyIp: submissionResult.proxyIp,
        pageUrl: submissionResult.pageUrl,
        deviceType: submissionResult.deviceType,
        timestamp: new Date().toISOString(),
        display,
        sheets: {
          masterSaved: sheetResults?.master?.success || false,
          adminSaved: sheetResults?.admin?.success || false,
        },
      },
    };
  }
}

export default new SubmissionService();
