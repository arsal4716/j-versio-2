import Center from "../models/Center.js";
import FormSetup from "../models/FormSetup.js";
import SubmissionLog from "../models/SubmissionLog.js";
import proxyService from "./proxyService.js";
import browserService from "./browserService.js";
import sheetService from "./sheetService.js";
import deviceService from "./deviceService.js";
import TypingHelper from "../helper/typingHelper.js";

import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  BrowserError,
} from "../utils/errorTypes.js";

import logger from "../utils/logger.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class SubmissionService {
  async submitForm(centerId, campaignName, formData, user) {
    let submissionLog = null;
    let browser = null;
    let page = null;
    let device = null;

    try {
      await this.validateUserAccess(user, centerId, campaignName);
      const { center, campaign } = await this.getCenterAndCampaign(centerId, campaignName);
      const formSetup = await this.getFormSetup(centerId, campaignName);

      submissionLog = await this.createSubmissionLog(centerId, campaignName, formData, user);
      const proxyConfig = await proxyService.getProxyForCenter(center, formData);

      // Select device
      device = deviceService.selectDeviceBasedOnDistribution(center?.settings?.deviceDistribution);

      // Launch Browser
      ({ browser, page } = await browserService.launchBrowserWithProxy({
        proxyUrl: proxyConfig.proxyUrl,
        proxyUsername: proxyConfig.username,
        proxyPassword: proxyConfig.password,
        referrers: center?.settings?.referrers,
      }));

      await browserService.emulateDevice(page, device);
      await this.navigateToLander(page, formSetup.landerUrl);

      // --- REQUIREMENT 1: WARM-UP DELAY (4-8s) ---
      const warmUp = Math.floor(Math.random() * 4000) + 4000;
      await sleep(warmUp);

      await this.injectIpAddresses(page, proxyConfig.ip);
      await this.setupTrustedFormListener(page);

      // Typing speed randomization
      const typingSpeed = this.getRandomTypingSpeed(center?.settings?.typingSpeed);
      const typingHelper = new TypingHelper(typingSpeed, {
        makeMistakesProbability: 0.3,
        fieldPause: { min: 1000, max: 3000 },
      });

      // --- REQUIREMENT 2: HUMANIZED FILLING ---
      await this.fillFormFields(page, formSetup.fields, formData, typingHelper, device.deviceType);

      // Consent Check (FIXED: Improved selector and multi-attempt click)
      let consentSelector = (formSetup?.consentSelector || "").trim();
      if (consentSelector && formData?.consent) {
        if (!consentSelector.startsWith("#") && !consentSelector.startsWith(".")) {
          consentSelector = `#${consentSelector}`;
        }
        await this.checkConsentCheckbox(page, consentSelector, device.deviceType);
      }

      // Pre-submit captures
      const leadId = await this.getLeadId(page);
      const ipAddress = await this.getUserIp(page);

      // Prepare Submit
      let submitSelector = (formSetup?.submitButtonSelector || "").trim();
      if (submitSelector && !submitSelector.startsWith("#") && !submitSelector.startsWith(".")) {
        submitSelector = `#${submitSelector}`;
      }

      // --- REQUIREMENT 3: THE SUBMIT & STAY OPEN FIX ---
      // 1. Click the button
      await this.clickSubmitButton(page, submitSelector, device.deviceType);

      // 2. IMMEDIATE HARD SLEEP (Ensures playback captures everything)
      const stayOpenSeconds = Math.max(Number(center?.settings?.stayOpenTime) || 9, 9);
      logger.info(`Submit clicked. Locking browser open for ${stayOpenSeconds}s...`);
      await sleep(stayOpenSeconds * 1000);

      // 3. Capture Final URL after the wait
      const finalPageUrl = page.url();
      const trustedFormData = await this.getTrustedFormData(page);

      const submissionResult = {
        ...formData,
        leadId,
        trustedForm: trustedFormData?.cert || "",
        ipAddress,
        proxyIp: proxyConfig.ip,
        pageUrl: finalPageUrl,
        deviceType: device.deviceType,
        userAgent: device.userAgent,
      };

      // Save to Sheets
      const sheetResults = await sheetService.saveSubmissionToSheets(center, campaign, submissionResult, formSetup);

      await this.updateSubmissionLogSuccess(submissionLog, submissionResult, sheetResults);
      return this.formatSuccessResponse(submissionResult, sheetResults);

    } catch (error) {
      logger.error("Form submission failed", { error: error.message });
      if (submissionLog) await this.updateSubmissionLogFailure(submissionLog, error);
      throw error;
    } finally {
      await browserService.closeBrowser(browser);
    }
  }

  // Optimized Helper methods below

  async fillFormFields(page, fields, formData, typingHelper, deviceType) {
    const isDesktop = deviceType === "desktop";
    for (const field of fields) {
      let selector = field?.selector?.trim();
      const name = field?.name;
      if (!selector || !name) continue;
      
      if (!selector.startsWith("#") && !selector.startsWith(".")) selector = `#${selector}`;

      const value = (formData?.[name] !== undefined ? String(formData[name]) : "") ||
                    (field?.defaultValue ? String(field.defaultValue) : "");

      if (field?.required && (!value || value.trim() === "")) throw new ValidationError(`${field?.label || name} is required`);

      try {
        const isVisible = await browserService.waitForSelectorWithTimeout(page, selector, 7000);
        if (!isVisible) continue;

        await browserService.scrollIntoViewWithOffset(page, selector);

        if (isDesktop) {
          await browserService.moveMouseToElement(page, selector);
          await sleep(250);
          await page.click(selector);
        } else {
          await page.tap(selector);
        }

        await sleep(400);
        await typingHelper.simulateTyping(page, selector, value);
      } catch (error) {
        logger.error("Error filling field", { name, selector, error: error.message });
      }
    }
  }

  /**
   * FIXED: Checks the consent checkbox.
   * If clicking the checkbox doesn't work, it clicks the parent (label).
   */
  async checkConsentCheckbox(page, selector, deviceType) {
    try {
      await browserService.scrollIntoViewWithOffset(page, selector);
      
      if (deviceType === "desktop") {
        await browserService.moveMouseToElement(page, selector);
        await sleep(300);
        await page.click(selector);
      } else {
        await page.tap(selector);
      }

      // Verify if checked
      const isChecked = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? (el.checked || el.getAttribute('aria-checked') === 'true') : false;
      }, selector);

      if (!isChecked) {
        logger.debug("Checkbox not checked on first try, attempting parent click...");
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el && el.parentElement) el.parentElement.click();
        }, selector);
      }
    } catch (error) {
      logger.error(`Consent checkbox error: ${error.message}`);
    }
  }

  async clickSubmitButton(page, submitSelector, deviceType) {
    try {
      await browserService.scrollIntoViewWithOffset(page, submitSelector);
      if (deviceType === "desktop") {
        await browserService.moveMouseToElement(page, submitSelector);
        await sleep(500);
        await page.click(submitSelector);
      } else {
        await page.tap(submitSelector);
      }
    } catch (error) {
      logger.error("Submit button click failed", { error: error.message });
    }
  }

  // --- Logic Consistency Helpers ---

  getRandomTypingSpeed(centerTypingSpeed) {
    if (centerTypingSpeed && typeof centerTypingSpeed === "number") {
      const min = Math.max(centerTypingSpeed - 200, 300);
      const max = centerTypingSpeed + 200;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.floor(Math.random() * (1200 - 600 + 1)) + 600;
  }

  async navigateToLander(page, url) {
    await page.goto(url, { waitUntil: "load", timeout: 90000 });
  }

  async injectIpAddresses(page, proxyIp) {
    await page.evaluate((ip) => { window.trustedFormIp = ip; window.jornayaIp = ip; }, proxyIp);
  }

  async setupTrustedFormListener(page) {
    await page.evaluate(() => {
      window._trustedFormData = null;
      const captureTF = () => {
        const cert = document.querySelector("#xxTrustedFormCertUrl_0")?.value || "";
        if (cert) { window._trustedFormData = { cert }; return true; }
        return false;
      };
      const observer = new MutationObserver(() => { if (captureTF()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  async getLeadId(page) {
    try { return (await browserService.getFieldValue(page, "#leadid_token") || "").trim(); } catch { return ""; }
  }

  async getUserIp(page) {
    try { return (await browserService.getFieldValue(page, "#user_ip") || "").trim(); } catch { return ""; }
  }

  async getTrustedFormData(page) {
    const tfData = await page.evaluate(() => window._trustedFormData).catch(() => null);
    if (tfData) return tfData;
    return { cert: (await browserService.getFieldValue(page, "#xxTrustedFormCertUrl_0").catch(() => "")) || "" };
  }

  async validateUserAccess(user, centerId, campaignName) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (roles.includes("super_admin")) return;
    if (user?.centerId?.toString() !== centerId?.toString()) throw new AuthorizationError("Access denied");
    if (!user?.allowedCampaigns?.includes(campaignName)) throw new AuthorizationError("Campaign denied");
  }

  async getCenterAndCampaign(centerId, campaignName) {
    const center = await Center.findById(centerId).lean();
    if (!center) throw new NotFoundError("Center not found");
    const campaign = (center.campaigns || []).find((c) => c.name === campaignName && c.isActive);
    if (!campaign) throw new NotFoundError("Campaign not found");
    return { center, campaign };
  }

  async getFormSetup(centerId, campaignName) {
    const formSetup = await FormSetup.findOne({ centerId, campaignName }).lean();
    if (!formSetup) throw new NotFoundError("FormSetup not found");
    return formSetup;
  }

  async createSubmissionLog(centerId, campaignName, formData, user) {
    const log = new SubmissionLog({
      centerId, campaignName, userId: user._id,
      formData: new Map(Object.entries(formData || {})),
      timestamps: { startedAt: new Date() }, result: "pending",
    });
    return await log.save();
  }

  async updateSubmissionLogSuccess(submissionLog, submissionResult, sheetResults) {
    submissionLog.result = "success";
    submissionLog.metadata = { ...submissionResult };
    submissionLog.timestamps.completedAt = new Date();
    submissionLog.timestamps.duration = submissionLog.timestamps.completedAt - submissionLog.timestamps.startedAt;
    submissionLog.sheetStatus = { master: !!sheetResults?.master?.success, admin: !!sheetResults?.admin?.success };
    await submissionLog.save();
  }

  async updateSubmissionLogFailure(submissionLog, error) {
    submissionLog.result = "failed";
    submissionLog.errorDetails = { message: error.message };
    submissionLog.timestamps.completedAt = new Date();
    await submissionLog.save();
  }

  formatSuccessResponse(submissionResult, sheetResults) {
    return { success: true, message: "Form submitted successfully", data: { ...submissionResult, sheets: sheetResults } };
  }
}

export default new SubmissionService();