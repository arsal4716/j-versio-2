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



      // Consent Check

      let consentSelector = (formSetup?.consentSelector || "").trim();

      if (consentSelector && !consentSelector.startsWith("#") && !consentSelector.startsWith(".")) {

        consentSelector = `#${consentSelector}`;

      }

      if (consentSelector && formData?.consent) {

        await this.checkConsentCheckbox(page, consentSelector, device.deviceType);

      }



      // Pre-submit captures

      const leadId = await this.getLeadId(page);

      const ipAddress = await this.getUserIp(page);

      

      // Prepare Submit

      let submitSelector = (formSetup?.submitButtonSelector || "").trim();

      if (!submitSelector.startsWith("#") && !submitSelector.startsWith(".")) {

        submitSelector = `#${submitSelector}`;

      }



      // --- REQUIREMENT 3: THE SUBMIT & STAY OPEN FIX ---

      // 1. Click the button

      await this.clickSubmitButton(page, submitSelector, device.deviceType);

      

      // 2. IMMEDIATE HARD SLEEP (Ensures playback captures everything)

      const stayOpenSeconds = Math.max(Number(center?.settings?.stayOpenTime) || 9, 9);

      logger.info(`Submit clicked. Locking browser open for ${stayOpenSeconds}s...`);

      await sleep(stayOpenSeconds * 1000); 



      // 3. Capture Final URL after the 9s wait

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



      // Save to Sheets (Happens while browser is still open)

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
      await page.goto(url, { waitUntil: "load", timeout: 90000 });
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
        const cert = document.querySelector("#xxTrustedFormCertUrl_0")?.value || "";
        const token = document.querySelector("#xxTrustedFormToken_0")?.value || "";
        const ping = document.querySelector("#xxTrustedFormPingUrl_0")?.value || "";
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
          await sleep(Math.floor(Math.random() * 200 + 100));
          await page.click(selector);
        } else {
          await page.tap(selector);
        }

        await sleep(Math.floor(Math.random() * 400) + 300);

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

  /**
   * Checks the consent checkbox using device-appropriate click.
   */
  async checkConsentCheckbox(page, selector, deviceType) {
    try {
      await browserService.clickElement(page, selector, deviceType);

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
    try {
      const v = await browserService.getFieldValue(page, "#leadid_token");
      return (v || "").trim();
    } catch {
      return "";
    }
  }

  async getUserIp(page) {
    try {
      const v = await browserService.getFieldValue(page, "#user_ip");
      return (v || "").trim();
    } catch {
      return "";
    }
  }

  async getTrustedFormData(page) {
    const tfData = await page.evaluate(() => window._trustedFormData).catch(() => null);
    if (tfData) return tfData;

    return {
      cert: (await browserService.getFieldValue(page, "#xxTrustedFormCertUrl_0").catch(() => "")) || "",
      token: (await browserService.getFieldValue(page, "#xxTrustedFormToken_0").catch(() => "")) || "",
      ping: (await browserService.getFieldValue(page, "#xxTrustedFormPingUrl_0").catch(() => "")) || "",
    };
  }

  /**
   * Clicks the submit button with device-appropriate behavior.
   * IMPORTANT: no waitForNavigation here.
   */
  
  async clickSubmitButton(page, submitSelector, deviceType) {

    await browserService.scrollIntoViewWithOffset(page, submitSelector);

    if (deviceType === "desktop") {

      await browserService.moveMouseToElement(page, submitSelector);

      await sleep(500);

      await page.click(submitSelector);

    } else {

      await page.tap(submitSelector);

    }

    await sleep(1000); // Wait for click event to trigger

  }

  /**
   * NOTE: legacy method; not used for the stay-open guarantee.
   */
  async waitForProcessing(page, stayOpenTime = 9) {
    const seconds = Number(stayOpenTime);
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 9) : 9;

    logger.debug("Waiting after submit (legacy method)", { stayOpenTime: safeSeconds });
    await sleep(safeSeconds * 1000);
    return page.url();
  }

  async updateSubmissionLogSuccess(submissionLog, submissionResult, sheetResults) {
    const completedAt = new Date();
    const duration = completedAt - submissionLog.timestamps.startedAt;

    submissionLog.result = "success";

    const leadId = (submissionResult.leadId || "").trim();

    submissionLog.metadata = {
      ...(leadId ? { leadId } : {}),
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
