// scripts/createSuperAdmin.js
import dotenv from "dotenv";
dotenv.config();
import { registerUser } from "../services/authService.js";

const createSuperAdmin = async () => {
  try {
    const superAdminData = {
      name: "Super Admin",
      company: "The Select Code",
      email: "admin@theselectcode.com",
      password: "123456",
      role: "user", 
      verificationCode: null,
      centerId: null,
      allowedCampaigns: [],
    };

    const existing = await registerUser.findByEmail(superAdminData.email); 

    if (existing) {
      console.log("Super Admin already exists:", superAdminData.email);
      return;
    }

    const result = await registerUser(superAdminData);
    console.log("Super Admin created successfully:", result.email);
    process.exit(0);
  } catch (err) {
    console.error("Failed to create Super Admin:", err);
    process.exit(1);
  }
};

createSuperAdmin();
