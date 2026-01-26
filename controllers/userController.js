// userController.js
const User = require('../models/User');
const Center = require('../models/Center');
const { success, fail } = require('../utils/response');
const { STATUS_CODES } = require('../config/constants');
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res, next) => {
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

    // Only super_admin can see all users, so we don't filter by createdBy
    // But note: If we want to let center admins see their own users, we need to adjust

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

exports.getUserById = async (req, res, next) => {
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

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, company, roles, centerId, allowedCampaigns } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return fail(res, {
        message: 'User already exists',
        status: STATUS_CODES.BAD_REQUEST
      });
    }

    // If centerId is provided, check if the center exists
    if (centerId) {
      const center = await Center.findById(centerId);
      if (!center) {
        return fail(res, {
          message: 'Center not found',
          status: STATUS_CODES.NOT_FOUND
        });
      }
    }

    // Hash password
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

    return success(res, {
      message: 'User created successfully',
      data: userResponse,
      status: STATUS_CODES.CREATED
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    // If centerId is provided, check if the center exists
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

    return success(res, {
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return fail(res, {
        message: 'User not found',
        status: STATUS_CODES.NOT_FOUND
      });
    }

    return success(res, {
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};