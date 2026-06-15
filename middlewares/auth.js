import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Center from "../models/Center.js";
import { fail } from "../utils/response.js";
import { STATUS_CODES, JWT } from "../config/constants.js";

export const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return fail(res, {
        message: "No token, authorization denied",
        status: STATUS_CODES.UNAUTHORIZED,
      });
    }

    const decoded = jwt.verify(token, JWT.SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return fail(res, {
        message: "Token is not valid",
        status: STATUS_CODES.UNAUTHORIZED,
      });
    }

    // If the user's center has been revoked, terminate the session immediately
    // with the super admin's custom message (the client signs out on this flag).
    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (user.centerId && !roles.includes("super_admin")) {
      const center = await Center.findById(user.centerId).select("status revokeMessage").lean();
      if (center?.status === "revoked") {
        return res.status(403).json({
          success: false,
          message: center.revokeMessage || "Your center's access has been revoked.",
          centerRevoked: true,
          data: null,
          errors: null,
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return fail(res, {
      message: "Token is not valid",
      status: STATUS_CODES.UNAUTHORIZED,
    });
  }
};

export const authorize = (allowed = []) => {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.user?.roles)
      ? req.user.roles
      : req.user?.role
      ? [req.user.role]
      : [];

    const ok = allowed.some((r) => userRoles.includes(r));

    if (!ok) {
      return fail(res, {
        message: "Access denied. Insufficient permissions.",
        status: STATUS_CODES.FORBIDDEN,
      });
    }

    next();
  };
};
