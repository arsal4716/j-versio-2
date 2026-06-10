import { validationResult } from "express-validator";
import { registerUser, loginUser } from "../services/authService.js";
import { success, fail } from "../utils/response.js";
import { STATUS_CODES } from "../config/constants.js";

export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, {
        message: "Validation failed",
        errors: errors.mapped(),
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    const {
      name,
      company,
      email,
      password,
      verificationCode,
      centerId,
      allowedCampaigns,
    } = req.body;

    const result = await registerUser({
      name,
      company,
      email,
      password,
      verificationCode,
      centerId,
      allowedCampaigns,
    });

    return success(res, {
      message: "User registered successfully",
      data: result,
      status: STATUS_CODES.CREATED,
    });
  } catch (err) {
    return next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return fail(res, {
        message: "Validation failed",
        errors: errors.mapped(),
        status: STATUS_CODES.BAD_REQUEST,
      });
    }

    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    return success(res, {
      message: "Login successful",
      data: result,
      status: STATUS_CODES.SUCCESS,
    });
  } catch (err) {
    return next(err);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    return success(res, {
      message: "User fetched successfully",
      data: req.user,
      status: STATUS_CODES.SUCCESS,
    });
  } catch (err) {
    return next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    return success(res, {
      message: "Logout successful",
      status: STATUS_CODES.SUCCESS,
    });
  } catch (err) {
    return next(err);
  }
};
