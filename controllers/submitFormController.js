// backend/controllers/submitFormController.js
const submissionServiceImport = require("../services/submissionService");
const submissionService =
  submissionServiceImport?.default || submissionServiceImport;

const { success, fail } = require("../utils/response");

const loggerImport = require("../utils/logger");
const logger = loggerImport?.default || loggerImport;

const Center = require("../models/Center");
const FormSetup = require("../models/FormSetup");

const isSuperAdmin = (user) =>
  Array.isArray(user?.roles) && user.roles.includes("super_admin");

const isEmptyValue = (val) => {
  if (val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
};

class SubmitFormController {
  submitForm = async (req, res) => {
    try {
      const { centerId, campaignName } = req.params;
      const user = req.user;

      if (!centerId || !campaignName) {
        return fail(res, {
          message: "centerId and campaignName are required",
          status: 400,
        });
      }

      // Center access
      if (!isSuperAdmin(user) && user?.centerId?.toString() !== centerId) {
        return fail(res, {
          message: "Access denied: You do not belong to this center",
          status: 403,
        });
      }

      // Campaign access
      if (
        !isSuperAdmin(user) &&
        (!user?.allowedCampaigns || !user.allowedCampaigns.includes(campaignName))
      ) {
        return fail(res, {
          message: `Access denied: You don't have permission for campaign "${campaignName}"`,
          status: 403,
        });
      }

      // Center exists?
      const center = await Center.findById(centerId).lean();
      if (!center) {
        return fail(res, { message: "Center not found", status: 404 });
      }

      // Campaign exists + active?
      const campaign = (center.campaigns || []).find(
        (c) => c.name === campaignName && c.isActive
      );
      if (!campaign) {
        return fail(res, {
          message: "Campaign not found or inactive",
          status: 404,
        });
      }

      // Form setup exists?
      const formSetup = await FormSetup.findOne({ centerId, campaignName }).lean();
      if (!formSetup) {
        return fail(res, {
          message: "Form setup not found for this campaign",
          status: 404,
        });
      }

      // Required fields validation (dynamic)
      const fields = Array.isArray(formSetup.fields) ? formSetup.fields : [];
      const requiredFields = fields.filter((f) => !!f.required);

      const errors = {};
      for (const f of requiredFields) {
        const key = f?.name;
        if (!key) continue;

        const directVal = req.body?.[key];
        const nestedVal = req.body?.additionalData?.[key];
        const value = directVal !== undefined ? directVal : nestedVal;

        if (isEmptyValue(value)) {
          errors[key] = `${f.label || key} is required`;
        }
      }

      if (Object.keys(errors).length > 0) {
        return fail(res, {
          message: "Form validation failed",
          errors,
          status: 400,
        });
      }

      logger.info("Form submission initiated", {
        centerId,
        campaignName,
        userId: user?._id,
        userEmail: user?.email,
        service: "jornaya-bot",
      });

      const result = await submissionService.submitForm(
        centerId,
        campaignName,
        req.body,
        user
      );

      logger.info("Form submission completed", {
        centerId,
        campaignName,
        leadId: result?.data?.leadId,
        success: true,
      });

      return success(res, {
        message: result?.message || "Form submitted successfully",
        data: result?.data || null,
      });
    } catch (error) {
      logger.error("Form submission controller error", {
        error: error?.message,
        centerId: req.params?.centerId,
        campaignName: req.params?.campaignName,
        userId: req.user?._id,
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      });

      return fail(res, {
        message: error?.message || "Internal server error",
        errors: error?.errors || null,
        status: error?.statusCode || error?.status || 500,
      });
    }
  };

  getCampaignFormFields = async (req, res) => {
    try {
      const { centerId, campaignName } = req.params;
      const user = req.user;

      if (!centerId || !campaignName) {
        return fail(res, {
          message: "centerId and campaignName are required",
          status: 400,
        });
      }

      if (!isSuperAdmin(user) && user?.centerId?.toString() !== centerId) {
        return fail(res, {
          message: "Access denied to this center",
          status: 403,
        });
      }

      if (
        !isSuperAdmin(user) &&
        (!user?.allowedCampaigns || !user.allowedCampaigns.includes(campaignName))
      ) {
        return fail(res, {
          message: "You do not have permission for this campaign",
          status: 403,
        });
      }

      const center = await Center.findById(centerId).lean();
      if (!center) return fail(res, { message: "Center not found", status: 404 });

      const campaign = (center.campaigns || []).find(
        (c) => c.name === campaignName && c.isActive
      );
      if (!campaign) {
        return fail(res, { message: "Campaign not found or inactive", status: 404 });
      }

      const formSetup = await FormSetup.findOne({ centerId, campaignName }).lean();
      if (!formSetup) {
        return fail(res, {
          message: "Form setup not found for this campaign",
          status: 404,
        });
      }

      const fields = (formSetup.fields || []).map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: !!field.required,
        placeholder: field.placeholder || "",
        options: field.options,
        selector: field.selector,
      }));

      return success(res, {
        message: "Campaign form fields retrieved",
        data: {
          campaignName,
          landerUrl: formSetup.landerUrl,
          fields,
          hasConsent: !!formSetup.consentSelector,
          centerSettings: {
            typingSpeed: center?.settings?.typingSpeed,
            stayOpenTime: center?.settings?.stayOpenTime,
            deviceDistribution: center?.settings?.deviceDistribution,
            referrers: center?.settings?.referrers,
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching campaign form fields", {
        error: error?.message,
        centerId: req.params?.centerId,
        campaignName: req.params?.campaignName,
      });

      return fail(res, {
        message: error?.message || "Failed to fetch form fields",
        status: error?.statusCode || error?.status || 500,
      });
    }
  };
}

module.exports = new SubmitFormController();
