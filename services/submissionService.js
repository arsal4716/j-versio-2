// backend/services/submissionService.js
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

class SubmissionService {
  /**
   * Main entry point for form submission.
   */
  async submitForm(centerId, campaignName, formData, user) {
    let submissionLog = null;
    let browser = null;
    let page = null;
    let device = null; // store device info for later use

    try {
      await this.validateUserAccess(user, centerId, campaignName);

      const { center, campaign } = await this.getCenterAndCampaign(
        centerId,
        campaignName,
      );
      const formSetup = await this.getFormSetup(centerId, campaignName);

      submissionLog = await this.createSubmissionLog(
        centerId,
        campaignName,
        formData,
        user,
      );

      const proxyConfig = await proxyService.getProxyForCenter(
        center,
        formData,
      );

      // 1) Select device based on distribution
      device = deviceService.selectDeviceBasedOnDistribution(
        center?.settings?.deviceDistribution,
      );

      // 2) Launch browser with proxy
      ({ browser, page } = await browserService.launchBrowserWithProxy({
        proxyUrl: proxyConfig.proxyUrl,
        proxyUsername: proxyConfig.username,
        proxyPassword: proxyConfig.password,
        referrers: center?.settings?.referrers,
      }));

      // 3) Emulate device (viewport, userAgent, touch)
      await browserService.emulateDevice(page, device);

      // 4) Navigate to lander
      await this.navigateToLander(page, formSetup.landerUrl);

      // --- CRITICAL: Playback Warm-up (4-8s) ---
      const warmUpDelay = Math.floor(Math.random() * 4000) + 4000; // 4000-8000ms
      logger.debug("Warm-up delay before interaction", { delayMs: warmUpDelay });
      await new Promise((r) => setTimeout(r, warmUpDelay));
      // --- End warm-up ---

      await this.injectIpAddresses(page, proxyConfig.ip);

      // 5) Set up TrustedForm listener (as early as possible)
      await this.setupTrustedFormListener(page);

      // 6) Create TypingHelper with RANDOM typing speed per submission
      const typingSpeed = this.getRandomTypingSpeed(center?.settings?.typingSpeed);
      const typingHelper = new TypingHelper(typingSpeed, {
        makeMistakesProbability: 0.3,
        fieldPause: { min: 1000, max: 3000 },
      });

      // 7) Fill form fields with humanized interactions
      await this.fillFormFields(page, formSetup.fields, formData, typingHelper, device.deviceType);

      // 8) Consent checkbox (if any)
      let consentSelector = (formSetup?.consentSelector || "").trim();
      if (
        consentSelector &&
        !consentSelector.startsWith("#") &&
        !consentSelector.startsWith(".")
      ) {
        consentSelector = `#${consentSelector}`;
      }
      if (consentSelector && formData?.consent) {
        await this.checkConsentCheckbox(page, consentSelector, device.deviceType);
      }

      // 9) Capture lead ID and IP from hidden fields
      const leadId = await this.getLeadId(page);
      const ipAddress = await this.getUserIp(page);
      const trustedFormData = await this.getTrustedFormData(page);

      // 10) Prepare submit button selector
      let submitSelector = (formSetup?.submitButtonSelector || "").trim();
      if (!submitSelector) {
        throw new ValidationError("Submit button selector is missing in FormSetup");
      }
      if (!submitSelector.startsWith("#") && !submitSelector.startsWith(".")) {
        submitSelector = `#${submitSelector}`;
      }

      // 11) Click submit button (device-aware)
      await this.clickSubmitButton(page, submitSelector, device.deviceType);

      // 12) --- STAY OPEN FIX: Hard sleep for stayOpenTime seconds ---
      const stayOpenSeconds = Number(center?.settings?.stayOpenTime) || 9;
      const safeStayOpen = Number.isFinite(stayOpenSeconds) ? Math.max(stayOpenSeconds, 9) : 9;
      logger.debug("Hard sleep after submit", { seconds: safeStayOpen });
      await new Promise((r) => setTimeout(r, safeStayOpen * 1000));

      // 13) Capture final page URL
      const pageUrl = page.url();

      // 14) Assemble submission result
      const submissionResult = {
        ...formData,
        leadId,
        trustedForm: trustedFormData?.cert || "",
        ipAddress,
        proxyIp: proxyConfig.ip,
        pageUrl,
        deviceType: device.deviceType,
        userAgent: device.userAgent,
      };

      // 15) Save to Google Sheets (this happens AFTER the 9s wait)
      const sheetResults = await sheetService.saveSubmissionToSheets(
        center,
        campaign,
        submissionResult,
        formSetup,
      );

      if (!sheetResults?.master?.success || !sheetResults?.admin?.success) {
        const masterErr = sheetResults?.master?.success
          ? null
          : sheetResults?.master?.error;
        const adminErr = sheetResults?.admin?.success
          ? null
          : sheetResults?.admin?.error;

        const msgParts = [];
        if (masterErr) msgParts.push(`Center sheet: ${masterErr}`);
        if (adminErr) msgParts.push(`Admin sheet: ${adminErr}`);

        throw new ValidationError(
          msgParts.join(" | ") || "Google Sheets save failed",
        );
      }

      // 16) Update submission log with success
      await this.updateSubmissionLogSuccess(
        submissionLog,
        submissionResult,
        sheetResults,
      );

      logger.info("Form submission completed successfully", {
        centerId,
        campaignName,
        leadId,
        duration: submissionLog?.timestamps?.duration,
      });

      return this.formatSuccessResponse(submissionResult, sheetResults);
    } catch (error) {
      logger.error("Form submission failed", {
        centerId,
        campaignName,
        error: error.message,
        stack: error.stack,
      });

      if (submissionLog) {
        await this.updateSubmissionLogFailure(submissionLog, error);
      }

      throw error;
    } finally {
      // Browser is closed ONLY after everything (9s wait + sheet save) is done
      await browserService.closeBrowser(browser);
    }
  }

  /**
   * Generates a random typing speed (ms per character) for each submission.
   * If center.settings.typingSpeed is provided, it's used as a baseline ±200ms.
   * Otherwise a default range of 600–1200ms is used.
   */
  getRandomTypingSpeed(centerTypingSpeed) {
    if (centerTypingSpeed && typeof centerTypingSpeed === "number") {
      const min = Math.max(centerTypingSpeed - 200, 300); // ensure not too fast
      const max = centerTypingSpeed + 200;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    // Default range
    return Math.floor(Math.random() * (1200 - 600 + 1)) + 600;
  }

  // ------------------------------------------------------------
  // Existing helper methods (some modified for device awareness)
  // ------------------------------------------------------------

  validateUserAccess(user, centerId, campaignName) {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const isSuperAdmin = roles.includes("super_admin");
    if (isSuperAdmin) return;

    if (user?.centerId?.toString() !== centerId?.toString()) {
      throw new AuthorizationError("You do not have access to this center");
    }

    if (!user?.allowedCampaigns?.includes(campaignName)) {
      throw new AuthorizationError(
        "You do not have permission for this campaign",
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
    const formSetup = await FormSetup.findOne({
      centerId,
      campaignName,
    }).lean();
    if (!formSetup)
      throw new NotFoundError("Form configuration not found for this campaign");

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
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
      logger.debug("Navigated to lander", { url });
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
        const cert =
          document.querySelector("#xxTrustedFormCertUrl_0")?.value || "";
        const token =
          document.querySelector("#xxTrustedFormToken_0")?.value || "";
        const ping =
          document.querySelector("#xxTrustedFormPingUrl_0")?.value || "";
        if (cert && token && ping) {
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
    });
  }

  /**
   * Fills form fields with device-appropriate humanized behavior.
   * Sequence for DESKTOP: scroll → move mouse (25 steps) → click → wait 300-700ms → type with random per-keystroke delay.
   * Sequence for MOBILE/TABLET: scroll → tap → wait 300-700ms → type.
   */
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
        const isVisible = await browserService.waitForSelectorWithTimeout(
          page,
          selector,
          7000,
        );

        if (!isVisible) {
          logger.warn("Field not visible, skipping", { name, selector });
          continue;
        }

        // 1) Scroll into view (human-like)
        await browserService.scrollIntoViewWithOffset(page, selector);

        // 2) Click / tap the field
        if (isDesktop) {
          await browserService.moveMouseToElement(page, selector);
          // Very short pause before click
          await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 200 + 100)));
          await page.click(selector);
        } else {
          await page.tap(selector);
        }

        // 3) Human pause between click and typing (300-700ms)
        const pauseBeforeTyping = Math.floor(Math.random() * 400) + 300; // 300-700ms
        await new Promise((r) => setTimeout(r, pauseBeforeTyping));

        // 4) Type with random per-keystroke delays
        await typingHelper.simulateTyping(page, selector, value);

        logger.debug("Field filled", {
          name,
          selector,
          valueLength: value.length,
          deviceType,
        });
      } catch (error) {
        logger.error("Error filling field", {
          name,
          selector,
          error: error.message,
        });

        throw new BrowserError(
          `Failed to fill field ${field?.label || name} (${selector}): ${error.message}`,
        );
      }
    }
  }

  /**
   * Checks the consent checkbox using device-appropriate click.
   */
  async checkConsentCheckbox(page, selector, deviceType) {
    try {
      await browserService.clickElement(page, selector, deviceType);

      // Verify it's checked
      const isChecked = await page.evaluate((sel) => {
        const checkbox = document.querySelector(sel);
        return checkbox ? checkbox.checked : false;
      }, selector);

      if (!isChecked) {
        throw new Error("Consent checkbox could not be checked");
      }
    } catch (error) {
      throw new BrowserError(`Consent checkbox error: ${error.message}`);
    }
  }

  async getLeadId(page) {
    return await browserService.getFieldValue(page, "#leadid_token");
  }

  async getUserIp(page) {
    return await browserService.getFieldValue(page, "#user_ip");
  }

  async getTrustedFormData(page) {
    const tfData = await page.evaluate(() => window._trustedFormData);

    if (tfData) return tfData;

    return {
      cert:
        (await browserService.getFieldValue(page, "#xxTrustedFormCertUrl_0")) ||
        "",
      token:
        (await browserService.getFieldValue(page, "#xxTrustedFormToken_0")) ||
        "",
      ping:
        (await browserService.getFieldValue(page, "#xxTrustedFormPingUrl_0")) ||
        "",
    };
  }

  /**
   * Clicks the submit button with device-appropriate behavior.
   * IMPORTANT: waitForNavigation has been REMOVED – the "stay open" is handled by a hard sleep in the main flow.
   */
  async clickSubmitButton(page, submitSelector, deviceType) {
    try {
      await browserService.clickElement(page, submitSelector, deviceType);
      logger.debug("Form submitted (submit button clicked)");
    } catch (error) {
      throw new BrowserError(`Form submit click failed: ${error.message}`);
    }
  }

  /**
   * NOTE: This method is no longer used for the stay‑open wait.
   * It is kept for backward compatibility or alternative flows.
   */
  async waitForProcessing(page, stayOpenTime = 9) {
    const seconds = Number(stayOpenTime);
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 9) : 9;

    logger.debug("Waiting after submit (legacy method)", { stayOpenTime: safeSeconds });
    await new Promise((r) => setTimeout(r, safeSeconds * 1000));
    return page.url();
  }

  async updateSubmissionLogSuccess(submissionLog, submissionResult, sheetResults) {
    const completedAt = new Date();
    const duration = completedAt - submissionLog.timestamps.startedAt;

    submissionLog.result = "success";
    submissionLog.metadata = {
      leadId: submissionResult.leadId,
      trustedForm: submissionResult.trustedForm,
      ipAddress: submissionResult.ipAddress,
      proxyIp: submissionResult.proxyIp,
      pageUrl: submissionResult.pageUrl,
      userAgent: submissionResult.userAgent,
      deviceType: submissionResult.deviceType,
      referer: "dynamic",
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

  formatSuccessResponse(submissionResult, sheetResults) {
    return {
      success: true,
      message: "Form submitted successfully",
      data: {
        leadId: submissionResult.leadId,
        trustedForm: submissionResult.trustedForm,
        ipAddress: submissionResult.ipAddress,
        proxyIp: submissionResult.proxyIp,
        pageUrl: submissionResult.pageUrl,
        deviceType: submissionResult.deviceType,
        timestamp: new Date().toISOString(),
        sheets: {
          masterSaved: sheetResults?.master?.success || false,
          adminSaved: sheetResults?.admin?.success || false,
        },
      },
    };
  }
}

export default new SubmissionService();