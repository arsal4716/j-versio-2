// scripts/createSuperAdmin.js
// Standalone seed script. Run manually: `node controllers/createSuperAdmin.js`.
// NOTE: server.js does NOT use this; it seeds via utils/ensureSuperAdmin.js.
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import database from "../config/database.js";
import User from "../models/User.js";

const createSuperAdmin = async () => {
  try {
    await database.connect();

    const email = "admin@theselectcode.com";
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Super admin already exists.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("123456", 10);
    await User.create({
      name: "Super Admin",
      company: "The Select Code",
      email,
      password: hashedPassword,
      roles: ["super_admin"],
      centerId: null,
      allowedCampaigns: [],
    });

    console.log("Super admin created.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create Super Admin:", err);
    process.exit(1);
  }
};

createSuperAdmin();
