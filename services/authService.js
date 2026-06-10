import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Center from "../models/Center.js";
import { JWT } from "../config/constants.js";

export const registerUser = async (userData, creator = null) => {
  try {
    const { name, company, email, password, verificationCode,centerId ,allowedCampaigns } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("User already exists");
      error.status = 400;
      throw error;
    }
    let center = null;
    if (verificationCode) {
      center = await Center.findOne({ verificationCode });
      if (!center) {
        const error = new Error("Invalid verification code");
        error.status = 400;
        throw error;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      company,
      email,
      password: hashedPassword,
      roles: ["user"],
      centerId: centerId || center?._id || creator?.centerId || null, 
      allowedCampaigns,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, roles: user.roles, centerId: user.centerId },
      JWT.SECRET,
      { expiresIn: JWT.EXPIRES_IN }
    );

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        company: user.company,
        roles: user.roles,
        centerId: user.centerId,
        allowedCampaigns:user.allowedCampaigns
      },
      token,
    };
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (credentials) => {
  const { email, password } = credentials;

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  const token = jwt.sign(
    { id: user._id, roles: user.roles, centerId: user.centerId },
    JWT.SECRET,
    { expiresIn: JWT.EXPIRES_IN }
  );

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      company: user.company,
      roles: user.roles,
      centerId: user.centerId,
      allowedCampaigns: user.allowedCampaigns,
    },
    token,
  };
};
