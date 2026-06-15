// userController.js
import User from "../models/User.js";
import Center from "../models/Center.js";
import { success, fail } from "../utils/response.js";
import { STATUS_CODES } from "../config/constants.js";
import bcrypt from "bcryptjs";
import { audit } from "../services/auditService.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role, centerId } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filter.roles = role;
    }

    if (centerId) {
      filter.centerId = centerId;
    }
    const users = await User.find(filter)
      .select('-password')
      .populate('centerId', 'name verificationCode')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    return success(res, {
      message: 'Users fetched successfully',
      data: {
        users,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('centerId', 'name verificationCode');

    if (!user) {
      return fail(res, {
        message: 'User not found',
        status: STATUS_CODES.NOT_FOUND
      });
    }

    return success(res, {
      message: 'User fetched successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, company, roles, centerId, allowedCampaigns } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return fail(res, {
        message: 'User already exists',
        status: STATUS_CODES.BAD_REQUEST
      });
    }

    if (centerId) {
      const center = await Center.findById(centerId);
      if (!center) {
        return fail(res, {
          message: 'Center not found',
          status: STATUS_CODES.NOT_FOUND
        });
      }
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      company,
      roles: roles || ['user'],
      centerId: centerId || null,
      allowedCampaigns: allowedCampaigns || []
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    audit({
      req,
      centerId: user.centerId,
      action: "user.create",
      entity: "User",
      entityId: user._id,
      message: `User ${user.email} created`,
    });

    return success(res, {
      message: 'User created successfully',
      data: userResponse,
      status: STATUS_CODES.CREATED
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    if (updateData.centerId) {
      const center = await Center.findById(updateData.centerId);
      if (!center) {
        return fail(res, {
          message: 'Center not found',
          status: STATUS_CODES.NOT_FOUND
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('centerId', 'name verificationCode');

    if (!user) {
      return fail(res, {
        message: 'User not found',
        status: STATUS_CODES.NOT_FOUND
      });
    }

    audit({
      req,
      centerId: user.centerId,
      action: "user.update",
      entity: "User",
      entityId: user._id,
      message: `User ${user.email} updated`,
      details: { passwordChanged: !!req.body.password },
    });

    return success(res, {
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);

    if (!target) {
      return fail(res, {
        message: 'User not found',
        status: STATUS_CODES.NOT_FOUND
      });
    }

    // Super admin accounts are protected and can never be deleted.
    if (Array.isArray(target.roles) && target.roles.includes('super_admin')) {
      return fail(res, {
        message: 'Super admin accounts cannot be deleted',
        status: STATUS_CODES.FORBIDDEN
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    audit({
      req,
      centerId: user.centerId,
      action: "user.delete",
      entity: "User",
      entityId: user._id,
      message: `User ${user.email} deleted`,
    });

    return success(res, {
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};