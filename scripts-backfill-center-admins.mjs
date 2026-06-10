// scripts-backfill-center-admins.mjs
// One-off: create the missing admin User for every Center that doesn't have one.
// Run from the backend root:  node scripts-backfill-center-admins.mjs
// Login for each becomes: email = centerAdminEmail, password = verificationCode
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import database from "./config/database.js";
import Center from "./models/Center.js";
import User from "./models/User.js";

const run = async () => {
  await database.connect();

  const centers = await Center.find({});
  let created = 0;
  let skipped = 0;

  for (const center of centers) {
    if (!center.centerAdminEmail) {
      console.log(`SKIP (no admin email): center ${center._id} "${center.name}"`);
      skipped++;
      continue;
    }

    const existing = await User.findOne({ email: center.centerAdminEmail });
    if (existing) {
      console.log(`SKIP (admin exists): ${center.centerAdminEmail}`);
      skipped++;
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(center.verificationCode), salt);

    await User.create({
      name: `${center.name} Admin`,
      company: center.name,
      email: center.centerAdminEmail,
      password: hashedPassword,
      roles: ["admin"],
      centerId: center._id,
      allowedCampaigns: (center.campaigns || []).map((c) => c.name),
    });

    console.log(
      `CREATED admin: ${center.centerAdminEmail}  (password = verificationCode "${center.verificationCode}")`
    );
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  await database.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
