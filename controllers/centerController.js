import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import Center from "../models/Center.js";
import User from "../models/User.js";
import { success, fail } from "../utils/response.js";
import { STATUS_CODES } from "../config/constants.js";
import { audit } from "../services/auditService.js";
import { saveServiceAccountKey } from "../utils/storage.js";
import { encryptSecret } from "../utils/secretCrypto.js";

// Escapes a string for safe use inside a RegExp (used for case-insensitive
// exact-match uniqueness checks).
const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactCI = (value) => new RegExp(`^${escapeRegex(String(value).trim())}$`, "i");

export const createCenter = async (req, res, next) => {
  try {
    let {
      name,
      verificationCode,
      centerAdminEmail,
      proxy,
      googleSheets,
      settings,
    } = req.body;
    if (typeof proxy === "string") proxy = JSON.parse(proxy);
    if (typeof googleSheets === "string")
      googleSheets = JSON.parse(googleSheets);
    if (typeof settings === "string") settings = JSON.parse(settings);
    if (typeof settings?.deviceDistribution === "string")
      settings.deviceDistribution = JSON.parse(settings.deviceDistribution);
    if (typeof req.body.campaigns === "string")
      req.body.campaigns = JSON.parse(req.body.campaigns);

    if (!name || !String(name).trim()) {
      return fail(res, {
        message: "Center name is required",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    // Center name must be globally unique (case-insensitive).
    const nameTaken = await Center.findOne({ name: exactCI(name) });
    if (nameTaken) {
      return fail(res, {
        message: "A center with this name already exists",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    // Verification code is the registration key: a unique 6-digit number per
    // center. Agents type it on the register page to load that center's campaigns.
    if (!/^\d{6}$/.test(String(verificationCode || ""))) {
      return fail(res, {
        message: "Verification code must be exactly 6 digits",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    const existingCenter = await Center.findOne({ verificationCode });
    if (existingCenter) {
      return fail(res, {
        message: "Verification code already exists",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    let clientKeyFilePath = null;
    let clientKeyEnc = "";

    if (req.file) {
      // Validates JSON and stores it at sheets/{name}/google-key.json (local
      // cache) AND encrypted in MongoDB so every server can use it.
      clientKeyFilePath = saveServiceAccountKey(name, req.file.path);
      try {
        clientKeyEnc = encryptSecret(fs.readFileSync(clientKeyFilePath, "utf8"));
      } catch {
        /* file already validated by saveServiceAccountKey; ignore */
      }
    }

    const center = new Center({
      name: String(name).trim(),
      verificationCode,
      centerAdminEmail,
      proxy: {
        provider: proxy?.provider || "decodo",
        username: proxy?.username,
        password: proxy?.password,
        type: proxy?.type || "zip",
      },
      googleSheets: {
        clientKeyFile: clientKeyFilePath,
        ...(clientKeyEnc ? { clientKeyEnc } : {}),
        masterSheetId: googleSheets?.masterSheetId,
        adminSheetId: googleSheets?.adminSheetId,
      },
      campaigns: Array.isArray(req.body.campaigns) ? req.body.campaigns : [],

      settings: {
        typingSpeed: settings?.typingSpeed || 800,
        stayOpenTime: settings?.stayOpenTime || 9,
        deviceDistribution: {
          desktop: settings?.deviceDistribution?.desktop ?? 60,
          tablet: settings?.deviceDistribution?.tablet ?? 20,
          mobile: settings?.deviceDistribution?.mobile ?? 20,
        },
        referrers: settings?.referrers?.length
          ? settings.referrers
          : ["https://google.com", "https://facebook.com"],
      },
      createdBy: req.user._id,
    });

    await center.save();

    // Per spec: creating a center automatically provisions its admin account.
    // Login = centerAdminEmail / verificationCode. This must never leave an
    // orphan: if admin provisioning fails after the center is saved, we roll the
    // center back so the operator can retry cleanly.
    let adminCreated = false;
    try {
      const campaignNames = (center.campaigns || []).map((c) => c.name);
      const existingAdmin = await User.findOne({ email: centerAdminEmail });

      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(String(verificationCode), salt);
        await User.create({
          name: `${name} Admin`,
          company: name,
          email: centerAdminEmail,
          password: hashedPassword,
          roles: ["admin"],
          centerId: center._id,
          allowedCampaigns: campaignNames,
        });
        adminCreated = true;
      } else {
        // Repair an unlinked / passwordless admin so the account is usable.
        const repair = {};
        if (!existingAdmin.centerId) repair.centerId = center._id;
        if (!Array.isArray(existingAdmin.roles) || !existingAdmin.roles.includes("admin")) {
          repair.roles = [...new Set([...(existingAdmin.roles || []), "admin"])];
        }
        if (!existingAdmin.password) {
          const salt = await bcrypt.genSalt(10);
          repair.password = await bcrypt.hash(String(verificationCode), salt);
        }
        if (!existingAdmin.allowedCampaigns?.length && campaignNames.length) {
          repair.allowedCampaigns = campaignNames;
        }
        if (Object.keys(repair).length) {
          await User.updateOne({ _id: existingAdmin._id }, { $set: repair });
        }
      }
    } catch (adminErr) {
      await Center.findByIdAndDelete(center._id).catch(() => {});
      return fail(res, {
        message: `Failed to provision center admin: ${adminErr.message}`,
        status: STATUS_CODES.SERVER_ERROR,
      });
    }

    audit({
      req,
      centerId: center._id,
      action: "center.create",
      entity: "Center",
      entityId: center._id,
      message: `Center "${center.name}" created`,
    });

    return success(res, {
      message: "Center created successfully",
      data: {
        center,
        adminCreated,
        adminEmail: centerAdminEmail,
      },
      status: STATUS_CODES.CREATED,
    });
  } catch (error) {
    next(error);
  }
};

export const getCenters = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { centerAdminEmail: { $regex: search, $options: "i" } },
        { verificationCode: { $regex: search, $options: "i" } },
      ];
    }

    const isSuperAdmin = req.user.roles?.includes("super_admin");
    if (!isSuperAdmin) {
      // Admins/users belong to a center via centerId — centers are created by
      // the super admin, so scoping by createdBy would (wrongly) return nothing
      // and hide their own center (and therefore their records/campaign tabs).
      filter._id = req.user.centerId || null;
    }

    const centers = await Center.find(filter)
      .populate("createdBy", "name email")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Center.countDocuments(filter);

    return success(res, {
      message: "Centers fetched successfully",
      data: {
        centers,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
    });
  } catch (error) {
    console.error("Error in getCenters:", error);
    next(error);
  }
};

export const getCenterById = async (req, res, next) => {
  try {
    const center = await Center.findById(req.params.id).populate(
      "createdBy",
      "name center Admin Email",
    );

    if (!center) {
      return fail(res, {
        message: "Center not found",
        status: STATUS_CODES.NOT_FOUND,
      });
    }

    if (
      req.user.role !== "super_admin" &&
      center.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return fail(res, {
        message: "Access denied",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    return success(res, {
      message: "Center fetched successfully",
      data: center,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCenter = async (req, res, next) => {
  try {
    const center = await Center.findById(req.params.id);

    if (!center) {
      return fail(res, {
        message: "Center not found",
        status: STATUS_CODES.NOT_FOUND,
      });
    }

    const isSuperAdmin = req.user.roles?.includes("super_admin");
    const isOwner = center.createdBy?.toString() === req.user._id.toString();

    if (!isSuperAdmin && !isOwner) {
      return fail(res, {
        message: "Access denied",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    const jsonFields = ["campaigns", "settings", "proxy", "googleSheets"];
    jsonFields.forEach((field) => {
      if (req.body[field] && typeof req.body[field] === "string") {
        req.body[field] = JSON.parse(req.body[field]);
      }
    });

    // A newly-uploaded Google key must be persisted on update too (this was
    // previously dropped, so re-uploading a key silently did nothing).
    if (req.file) {
      const savedPath = saveServiceAccountKey(req.body.name || center.name, req.file.path);
      let enc = "";
      try {
        enc = encryptSecret(fs.readFileSync(savedPath, "utf8"));
      } catch {
        /* ignore */
      }
      req.body.googleSheets = {
        ...(center.googleSheets?.toObject?.() || center.googleSheets || {}),
        ...(req.body.googleSheets || {}),
        clientKeyFile: savedPath,
        ...(enc ? { clientKeyEnc: enc } : {}),
      };
    } else if (req.body.googleSheets) {
      // No new key in this edit: merge onto the stored googleSheets and PRESERVE
      // the existing clientKeyFile, otherwise a normal save (which $set-replaces
      // the whole googleSheets object) would silently wipe the center's key.
      const existingGs = center.googleSheets?.toObject?.() || center.googleSheets || {};
      req.body.googleSheets = {
        ...existingGs,
        ...req.body.googleSheets,
        clientKeyFile: existingGs.clientKeyFile || null,
      };
    }

    // Enforce globally-unique center name on rename (case-insensitive).
    if (req.body.name && String(req.body.name).trim() !== center.name) {
      const clash = await Center.findOne({
        _id: { $ne: center._id },
        name: exactCI(req.body.name),
      });
      if (clash) {
        return fail(res, {
          message: "A center with this name already exists",
          status: STATUS_CODES.BAD_REQUEST,
        });
      }
      req.body.name = String(req.body.name).trim();
    }

    const updatedCenter = await Center.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).populate("createdBy", "name centerAdminEmail");

    audit({
      req,
      centerId: updatedCenter._id,
      action: "center.update",
      entity: "Center",
      entityId: updatedCenter._id,
      message: `Center "${updatedCenter.name}" updated`,
    });

    return success(res, {
      message: "Center updated successfully",
      data: updatedCenter,
    });
  } catch (error) {
    next(error);
  }
};

// Super admin: revoke or restore a center's access, with an optional custom
// message shown to that center's users when they are signed out / try to log in.
export const setCenterAccess = async (req, res, next) => {
  try {
    if (!req.user.roles?.includes("super_admin")) {
      return fail(res, {
        message: "Only super admin can change center access",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    const { status, revokeMessage } = req.body;
    if (!["active", "revoked"].includes(status)) {
      return fail(res, { message: "status must be 'active' or 'revoked'", status: STATUS_CODES.BAD_REQUEST });
    }

    const center = await Center.findById(req.params.id);
    if (!center) {
      return fail(res, { message: "Center not found", status: STATUS_CODES.NOT_FOUND });
    }

    center.status = status;
    if (status === "revoked") {
      center.revokeMessage =
        (revokeMessage || "").trim() ||
        "Your center's access has been revoked. Please contact the administrator.";
    } else {
      center.revokeMessage = "";
    }
    await center.save();

    audit({
      req,
      centerId: center._id,
      action: status === "revoked" ? "center.revoke" : "center.restore",
      entity: "Center",
      entityId: center._id,
      message: `Center "${center.name}" ${status === "revoked" ? "revoked" : "restored"}`,
    });

    return success(res, {
      message: status === "revoked" ? "Center access revoked" : "Center access restored",
      data: { _id: center._id, status: center.status, revokeMessage: center.revokeMessage },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCenter = async (req, res, next) => {
  try {
    const center = await Center.findById(req.params.id);

    if (!center) {
      return fail(res, {
        message: "Center not found",
        status: STATUS_CODES.NOT_FOUND,
      });
    }

    if (!req.user.roles.includes("super_admin")) {
      return fail(res, {
        message: "Access denied. Only super admin can delete centers.",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    await Center.findByIdAndDelete(req.params.id);

    audit({
      req,
      centerId: center._id,
      action: "center.delete",
      entity: "Center",
      entityId: center._id,
      message: `Center "${center.name}" deleted`,
    });

    return success(res, {
      message: "Center deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
