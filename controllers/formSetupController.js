// backend/controllers/formSetupController.js
const FormSetup = require("../models/FormSetup");
const Center = require("../models/Center");
const { success, fail } = require("../utils/response");
const { STATUS_CODES } = require("../config/constants");

function safeParse(value) {
  if (typeof value === "string" && value.length) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
}

exports.createFormSetup = async (req, res, next) => {
  try {
    const body = { ...req.body };
    body.fields = safeParse(body.fields) || [];
    body.centerId = body.centerId;
    body.campaignName = body.campaignName;
    body.landerUrl = body.landerUrl;
    body.submitButtonSelector = body.submitButtonSelector;
    body.consentSelector = body.consentSelector;
    body.notes = body.notes;

    if (!body.centerId || !body.campaignName || !body.landerUrl) {
      return fail(res, {
        message: "centerId, campaignName and landerUrl are required",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }
    const center = await Center.findById(body.centerId);
    if (!center) {
      return fail(res, {
        message: "Center not found",
        status: STATUS_CODES.NOT_FOUND,
      });
    }
    // Check if user is super_admin
    const isSuperAdmin = req.user.roles && req.user.roles.includes("super_admin");
    if (!isSuperAdmin && center.createdBy.toString() !== req.user._id.toString()) {
      return fail(res, {
        message: "Access denied",
        status: STATUS_CODES.FORBIDDEN,
      });
    }
    const exists = await FormSetup.findOne({
      centerId: body.centerId,
      campaignName: body.campaignName,
    });
    if (exists) {
      return fail(res, {
        message:
          "FormSetup for this center & campaign already exists. Use update.",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }
    const normalizedFields = (
      Array.isArray(body.fields) ? body.fields : []
    ).map((f) => {
      if (typeof f === "string") f = safeParse(f);
      return {
        label: f.label,
        name: f.name,
        type: f.type,
        selector: f.selector,
        placeholder: f.placeholder || "",
        options: Array.isArray(f.options)
          ? f.options
          : f.options
          ? [f.options]
          : undefined,
        required: !!f.required,
      };
    });

    const formSetup = new FormSetup({
      centerId: body.centerId,
      campaignName: body.campaignName,
      landerUrl: body.landerUrl,
      fields: normalizedFields,
      submitButtonSelector: body.submitButtonSelector,
      consentSelector: body.consentSelector,
      notes: body.notes,
      createdBy: req.user._id,
    });

    await formSetup.save();
    return success(res, {
      message: "FormSetup created",
      data: formSetup,
      status: STATUS_CODES.CREATED,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateFormSetup = async (req, res, next) => {
  try {
    const id = req.params.id;
    let body = { ...req.body };
    body.fields = safeParse(body.fields) || body.fields;

    const existing = await FormSetup.findById(id);
    if (!existing)
      return fail(res, {
        message: "FormSetup not found",
        status: STATUS_CODES.NOT_FOUND,
      });

    const isSuperAdmin = req.user.roles && req.user.roles.includes("super_admin");
    if (!isSuperAdmin) {
      const center = await Center.findById(existing.centerId);
      if (!center || center.createdBy.toString() !== req.user._id.toString()) {
        return fail(res, {
          message: "Access denied",
          status: STATUS_CODES.FORBIDDEN,
        });
      }
    }

    let normalizedFields = undefined;
    if (body.fields) {
      normalizedFields = (Array.isArray(body.fields) ? body.fields : []).map(
        (f) => {
          if (typeof f === "string") f = safeParse(f);
          return {
            label: f.label,
            name: f.name,
            type: f.type,
            selector: f.selector,
            placeholder: f.placeholder || "",
            options: Array.isArray(f.options)
              ? f.options
              : f.options
              ? [f.options]
              : undefined,
            required: !!f.required,
          };
        }
      );
    }

    const update = {
      ...(body.campaignName && { campaignName: body.campaignName }),
      ...(body.landerUrl && { landerUrl: body.landerUrl }),
      ...(body.submitButtonSelector && {
        submitButtonSelector: body.submitButtonSelector,
      }),
      ...(body.consentSelector && { consentSelector: body.consentSelector }),
      ...(body.notes && { notes: body.notes }),
    };
    if (normalizedFields) update.fields = normalizedFields;

    const updated = await FormSetup.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );
    return success(res, { message: "FormSetup updated", data: updated });
  } catch (err) {
    next(err);
  }
};

exports.getAllFormSetups = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, centerId, campaignName } = req.query;
    const filter = {};
    if (centerId) filter.centerId = centerId;
    if (campaignName)
      filter.campaignName = { $regex: campaignName, $options: "i" };
    
    // Check if user is super_admin
    const isSuperAdmin = req.user.roles && req.user.roles.includes("super_admin");
    if (!isSuperAdmin) filter.createdBy = req.user._id;

    const setups = await FormSetup.find(filter)
      .populate("centerId", "name verificationCode")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ updatedAt: -1 });
    const total = await FormSetup.countDocuments(filter);
    return success(res, {
      message: "Form setups fetched",
      data: { setups, total, page: Number(page) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getFormSetupByCenterCampaign = async (req, res, next) => {
  try {
    const { centerId, campaignName } = req.params;

    if (!centerId || !campaignName) {
      return fail(res, {
        message: "centerId & campaignName required",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    const setup = await FormSetup.findOne({ centerId, campaignName }).lean();
    if (!setup) {
      return fail(res, {
        message: "Form setup not found",
        status: STATUS_CODES.NOT_FOUND,
      });
    }

    const isSuperAdmin = req.user.roles && req.user.roles.includes("super_admin");
    if (!isSuperAdmin && (!req.user.allowedCampaigns || !req.user.allowedCampaigns.includes(campaignName))) {
      return fail(res, {
        message: "Access denied",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    return success(res, {
      message: "Form setup fetched",
      data: setup,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFormSetupByCampaign = async (req, res, next) => {
  try {
    const { campaignName } = req.params;
    const centerId = req.user?.centerId;

    const isSuperAdmin = req.user.roles && req.user.roles.includes("super_admin");

    if (!campaignName) {
      return fail(res, {
        message: "campaignName required",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    if (!isSuperAdmin && !centerId) {
      return fail(res, {
        message: "centerId missing in token",
        status: STATUS_CODES.UNAUTHORIZED,
      });
    }

    // Campaign access check for non-super-admin
    if (!isSuperAdmin && (!req.user.allowedCampaigns || !req.user.allowedCampaigns.includes(campaignName))) {
      return fail(res, {
        message: "Access denied",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    const setup = await FormSetup.findOne({
      centerId,
      campaignName,
    }).lean();

    if (!setup) {
      return fail(res, {
        message: "Form setup not found",
        status: STATUS_CODES.NOT_FOUND,
      });
    }

    return success(res, { message: "Form setup fetched", data: setup });
  } catch (err) {
    next(err);
  }
};

exports.deleteFormSetup = async (req, res, next) => {
  try {
    const id = req.params.id;
    const setup = await FormSetup.findById(id);
    if (!setup)
      return fail(res, {
        message: "Form setup not found",
        status: STATUS_CODES.NOT_FOUND,
      });

    const isSuperAdmin = req.user.roles && req.user.roles.includes("super_admin");
    if (!isSuperAdmin) {
      const center = await Center.findById(setup.centerId);
      if (!center || center.createdBy.toString() !== req.user._id.toString()) {
        return fail(res, {
          message: "Access denied",
          status: STATUS_CODES.FORBIDDEN,
        });
      }
    }

    await FormSetup.findByIdAndDelete(id);
    return success(res, { message: "Form setup deleted" });
  } catch (err) {
    next(err);
  }
};

exports.getCampaignsForCenter = async (req, res, next) => {
  try {
    const { centerId, verificationCode } = req.query;
    if (!centerId || !verificationCode) {
      return fail(res, {
        message: "centerId and verificationCode are required",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    const center = await Center.findOne({
      _id: centerId,
      verificationCode,
    }).lean();
    if (!center) {
      return fail(res, {
        message: "Center not found or invalid code",
        status: STATUS_CODES.NOT_FOUND,
      });
    }

    const campaigns = (center.campaigns || [])
      .filter((c) => c.isActive)
      .map((c) => ({ _id: c._id, name: c.name }));

    return success(res, { message: "Campaign list fetched", data: campaigns });
  } catch (err) {
    console.error("Error in getCampaignsForCenter:", err);
    next(err);
  }
};