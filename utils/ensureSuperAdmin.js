const bcrypt = require("bcryptjs");
const User = require("../models/User"); 
const ensureSuperAdmin = async () => {
  const email = "admin@theselectcode.com";

  const exists = await User.findOne({ email });
  if (exists) {
    return;
  }

  const hashedPassword = await bcrypt.hash("123456", 10);

  await User.create({
    name: "Super Admin",
    company: "selectcode",
    email,
    password: hashedPassword,
    roles: ["super_admin"],
  });

};

module.exports = ensureSuperAdmin;
