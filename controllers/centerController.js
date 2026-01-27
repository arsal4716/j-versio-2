import fs from "fs";
import path from "path";
import Center from "../models/Center.js";
import { success, fail } from "../utils/response.js";
import { STATUS_CODES } from "../config/constants.js";

export const createCenter = async (req, res, next) => {
  try {
    let {
      name,
      verificationCode,
      centerAdminEmail,
      contactPerson,
      phone,
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

    const existingCenter = await Center.findOne({ verificationCode });
    if (existingCenter) {
      return fail(res, {
        message: "Verification code already exists",
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    let clientKeyFilePath = null;

    if (req.file) {
      const folderPath = path.join("sheets", verificationCode);
      fs.mkdirSync(folderPath, { recursive: true });
      const filePath = path.join(folderPath, "client-key.json");
      fs.renameSync(req.file.path, filePath);
      clientKeyFilePath = filePath;
    }

    const center = new Center({
      name,
      verificationCode,
      centerAdminEmail,
      contactPerson,
      phone,
      proxy: {
        provider: proxy?.provider || "decodo",
        username: proxy?.username,
        password: proxy?.password,
        type: proxy?.type || "zip",
      },
      googleSheets: {
        clientKeyFile: clientKeyFilePath,
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

    return success(res, {
      message: "Center created successfully",
      data: center,
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
      filter.createdBy = req.user._id;
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

    const updatedCenter = await Center.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).populate("createdBy", "name centerAdminEmail");

    return success(res, {
      message: "Center updated successfully",
      data: updatedCenter,
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

    return success(res, {
      message: "Center deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
