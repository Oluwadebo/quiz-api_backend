import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "admin" },
    isVerified: { type: Boolean, default: true },
    verificationToken: String,
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("[DB] Connected");

  // ─── Admin user ───────────────────────────────────
  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existing) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);
    await User.create({
      name: "Super Admin",
      email: process.env.ADMIN_EMAIL,
      password: hashed,
      role: "admin",
    });
    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL}`);
  } else {
    console.log("Admin already exists — skipping");
  }

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
