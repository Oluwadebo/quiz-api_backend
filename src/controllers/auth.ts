import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { sendVerificationEmail } from "../lib/email";
import Settings from "../models/Setting";
import User from "../models/User";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Invalid email format")
    .refine(
      (val) => {
        const parts = val.split(".");
        return parts[parts.length - 1].length >= 2;
      },
      { message: "Email domain must be valid (e.g., .com, .net)" },
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const register = async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.errors[0].message,
    });
  }
  const { name, email, password } = result.data;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "student",
      isVerified: false,
      verificationToken,
    });

    const settings = await Settings.findOne({});
    const siteName = settings?.platformName || "QuizHub";
    const verifyLink = `${process.env.FRONTEND_URL}/api/auth/verify?token=${verificationToken}`;
    try {
      await sendVerificationEmail(email, verifyLink, siteName);
      console.log(`Verification email sent to ${email}`);
    } catch (emailError: any) {
      console.error("Email send failed:", emailError.message);
      return res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        message:
          "Account created but verification email failed. Please contact support.",
        emailSent: false,
      });
    }
    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message:
        "Registration successful. Please check your email to verify your account.",
      emailSent: true,
    });
  } catch (err: any) {
    console.error("Register error:", err.message);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isVerified) {
      return res.status(403).json({
        error:
          "Your account is not verified. Please check your email! and verify, before logging in.",
      });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }
  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }
  if (user.isVerified) {
    return res.status(200).json({ message: "Already verified" });
  }
  user.isVerified = true;
  user.verificationToken = "";
  await user.save();
  return res.status(200).json({ message: "Email verified successfully" });
  // return res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
};
