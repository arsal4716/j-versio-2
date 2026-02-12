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

      // 1) Select device based on distribution
      device = deviceService.selectDeviceBasedOnDistribution(
        center?.settings?.deviceDistribution,
      );

      // 2) Launch browser
      ({ browser, page } = await browserService.launchBrowserWithProxy({
        proxyUrl: proxyConfig.proxyUrl,
        proxyUsername: proxyConfig.username,
        proxyPassword: proxyConfig.password,
        referrers: center?.settings?.referrers,
      }));

      // 3) Emulate device
      await browserService.emulateDevice(page, device);

      // 4) Navigate to lander
      await this.navigateToLander(page, formSetup.landerUrl);

      // --- CRITICAL: Playback Warm-up (4-8s) ---
      // This ensures the video starts with an empty form.
      const warmUpDelay = Math.floor(Math.random() * 4000) + 4000;
      logger.debug("Warm-up delay before interaction", { delayMs: warmUpDelay });
      await sleep(warmUpDelay);

      await this.injectIpAddresses(page, proxyConfig.ip);
      await this.setupTrustedFormListener(page);

      // 5) Typing Randomization
      const typingSpeed = this.getRandomTypingSpeed(center?.settings?.typingSpeed);
      const typingHelper = new TypingHelper(typingSpeed, {
        makeMistakesProbability: 0.3,
        fieldPause: { min: 1000, max: 3000 },
      });

      // 6) Fill form fields with humanized interactions
      await this.fillFormFields(
        page,
        formSetup.fields,
        formData,
        typingHelper,
        device.deviceType,
      );

      // 7) Consent checkbox (Conditional logic)
      let consentSelector = (formSetup?.consentSelector || "").trim();
      if (consentSelector) {
        if (!consentSelector.startsWith("#") && !consentSelector.startsWith(".")) {
          consentSelector = `#${consentSelector}`;
        }
        if (formData?.consent) {
          logger.debug("Processing consent checkbox interaction");
          await this.checkConsentCheckbox(page, consentSelector, device.deviceType);
        }
      }

      // 8) Capture lead data
      const leadId = await this.getLeadId(page);
      const ipAddress = await this.getUserIp(page);

      // 9) Submit Button Selection
      let submitSelector = (formSetup?.submitButtonSelector || "").trim();
      if (!submitSelector) {
        throw new ValidationError("Submit button selector is missing in FormSetup");
      }
      if (!submitSelector.startsWith("#") && !submitSelector.startsWith(".")) {
        submitSelector = `#${submitSelector}`;
      }

      // 10) Click submit button
      await this.clickSubmitButton(page, submitSelector, device.deviceType);

      // --- CRITICAL: Post-Submit Hold (stayOpenTime) ---
      // We hold the browser open IMMEDIATELY after the click.
      const stayOpenSeconds = Number(center?.settings?.stayOpenTime);
      const postSubmitHoldMs = (Number.isFinite(stayOpenSeconds) ? Math.max(stayOpenSeconds, 9) : 9) * 1000;
      
      logger.info(`Form clicked. Holding browser for ${postSubmitHoldMs / 1000}s to capture playback.`);
      await sleep(postSubmitHoldMs);

      // 11) Final Captures after the wait
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

      // 12) Save to Google Sheets
      const sheetResults = await sheetService.saveSubmissionToSheets(
        center,
        campaign,
        submissionResult,
        formSetup,
      );

      // 13) Update Logs
      await this.updateSubmissionLogSuccess(
        submissionLog,
        submissionResult,
        sheetResults,
      );

      return this.formatSuccessResponse(submissionResult, sheetResults);

    } catch (error) {
      logger.error("Form submission failed", { error: error.message });
      if (submissionLog) await this.updateSubmissionLogFailure(submissionLog, error);
      throw error;
    } finally {
      // Browser only closes after the 9s+ sleep is finished
      await browserService.closeBrowser(browser);
    }
  }

  /**
   * Universal Human Interaction Helper
   * Handles Cursor movement for Desktop and Taps for Mobile
   */
  async humanInteraction(page, selector, deviceType) {
    const isDesktop = deviceType === "desktop";
    
    const isVisible = await browserService.waitForSelectorWithTimeout(page, selector, 7000);
    if (!isVisible) {
      throw new Error(`Element ${selector} not visible for interaction`);
    }

    // Ensure it's in view
    await browserService.scrollIntoViewWithOffset(page, selector);
    await sleep(500); // Wait for scroll to settle

    if (isDesktop) {
      // Visible cursor movement
      await browserService.moveMouseToElement(page, selector);
      await sleep(Math.floor(Math.random() * 300) + 200); 
      await page.click(selector);
    } else {
      // Mobile tap (no cursor)
      await page.tap(selector);
    }
    
    // Brief pause after interaction
    await sleep(Math.floor(Math.random() * 400) + 300);
  }

  async fillFormFields(page, fields, formData, typingHelper, deviceType) {
    for (const field of fields) {
      let selector = field?.selector?.trim();
      const name = field?.name;
      if (!selector || !name) continue;

      if (!selector.startsWith("#") && !selector.startsWith(".")) {
        selector = `#${selector}`;
      }

      const value = (formData?.[name] !== undefined ? String(formData[name]) : "") ||
                    (field?.defaultValue ? String(field.defaultValue) : "");

      if (field?.required && (!value || value.trim() === "")) {
        throw new ValidationError(`${field?.label || name} is required`);
      }

      try {
        // Move, Click, Focus
        await this.humanInteraction(page, selector, deviceType);
        // Type
        await typingHelper.simulateTyping(page, selector, value);
      } catch (error) {
        logger.error("Error filling field", { name, selector, error: error.message });
        throw new BrowserError(`Failed to fill field ${name}: ${error.message}`);
      }
    }
  }

  async checkConsentCheckbox(page, selector, deviceType) {
    try {
      // Use the human helper to ensure cursor movement to the checkbox
      await this.humanInteraction(page, selector, deviceType);

      const isChecked = await page.evaluate((sel) => {
        const checkbox = document.querySelector(sel);
        if (!checkbox) return false;
        // If it's not a standard checkbox, it might be a div wrapper; 
        // this check is for standard inputs.
        return checkbox.checked || checkbox.getAttribute('aria-checked') === 'true';
      }, selector);

      if (!isChecked) {
        // If the click didn't check it (some landers need a click on the label),
        // we log it but don't necessarily crash unless it's a hard requirement.
        logger.warn("Consent checkbox click performed, but state is not 'checked'");
      }
    } catch (error) {
      throw new BrowserError(`Consent checkbox error: ${error.message}`);
    }
  }

  async clickSubmitButton(page, submitSelector, deviceType) {
    try {
      // Use human helper to ensure cursor movement to the submit button
      await this.humanInteraction(page, submitSelector, deviceType);
      logger.debug("Submit button clicked via human interaction");
    } catch (error) {
      throw new BrowserError(`Form submit click failed: ${error.message}`);
    }
  }

  // --- Utility Methods ---

  getRandomTypingSpeed(centerTypingSpeed) {
    const base = centerTypingSpeed || 800;
    const min = Math.max(base - 200, 300);
    const max = base + 200;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async navigateToLander(page, url) {
    try {
      await page.goto(url, { waitUntil: "load", timeout: 90000 });
    } catch (error) {
      throw new BrowserError(`Failed to navigate to lander: ${error.message}`);
    }
  }

  async injectIpAddresses(page, proxyIp) {
    await page.evaluate((ip) => {
      window.trustedFormIp = ip;
      window.jornayaIp = ip;
    }, proxyIp);
  }

  async setupTrustedFormListener(page) {
    await page.evaluate(() => {
      window._trustedFormData = null;
      const captureTF = () => {
        const cert = document.querySelector("#xxTrustedFormCertUrl_0")?.value || "";
        const token = document.querySelector("#xxTrustedFormToken_0")?.value || "";
        if (cert && token) {
          window._trustedFormData = { cert, token };
          return true;
        }
        return false;
      };
      if (captureTF()) return;
      const observer = new MutationObserver(() => { if (captureTF()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 6000);
    });
  }

  async getLeadId(page) {
    try { return (await browserService.getFieldValue(page, "#leadid_token") || "").trim(); } catch { return ""; }
  }

  async getUserIp(page) {
    try { return (await browserService.getFieldValue(page, "#user_ip") || "").trim(); } catch { return ""; }
  }

  async getTrustedFormData(page) {
    return await page.evaluate(() => window._trustedFormData).catch(() => null);
  }

  async validateUserAccess(user, centerId, campaignName) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (roles.includes("super_admin")) return;
    if (user?.centerId?.toString() !== centerId?.toString()) throw new AuthorizationError("Access denied to center");
    if (!user?.allowedCampaigns?.includes(campaignName)) throw new AuthorizationError("Access denied to campaign");
  }

  async getCenterAndCampaign(centerId, campaignName) {
    const center = await Center.findById(centerId).lean();
    if (!center) throw new NotFoundError("Center not found");
    const campaign = (center.campaigns || []).find(c => c.name === campaignName && c.isActive);
    if (!campaign) throw new NotFoundError("Campaign inactive");
    return { center, campaign };
  }

  async getFormSetup(centerId, campaignName) {
    const setup = await FormSetup.findOne({ centerId, campaignName }).lean();
    if (!setup || !setup.landerUrl) throw new ValidationError("Invalid form setup");
    return setup;
  }

  async createSubmissionLog(centerId, campaignName, formData, user) {
    const log = new SubmissionLog({
      centerId, campaignName, userId: user._id,
      formData: new Map(Object.entries(formData || {})),
      timestamps: { startedAt: new Date() }, result: "pending",
    });
    return await log.save();
  }

  async updateSubmissionLogSuccess(log, result, sheets) {
    log.result = "success";
    log.metadata = { ...result };
    log.timestamps.completedAt = new Date();
    log.timestamps.duration = log.timestamps.completedAt - log.timestamps.startedAt;
    log.sheetStatus = { master: sheets?.master?.success, admin: sheets?.admin?.success };
    await log.save();
  }

  async updateSubmissionLogFailure(log, error) {
    log.result = "failed";
    log.errorDetails = { message: error.message };
    log.timestamps.completedAt = new Date();
    await log.save();
  }

  formatSuccessResponse(result, sheets) {
    return { success: true, message: "Submitted", data: { ...result, sheets } };
  }
}

export default new SubmissionService();