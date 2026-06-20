import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { z } from "zod";
import User from "../models/User";

const resend = new Resend(process.env.RESEND_API_KEY);

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Invalid email format")
    .refine(
      (val) => {
        const parts = val.split(".");
        const domain = parts[parts.length - 1];
        return domain.length >= 2;
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
  // const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
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

    const verifyLink = `${process.env.FRONTEND_URL}/api/auth/verify?token=${verificationToken}`;

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    await resend.emails.send({
      from: "onboarding@resend.dev", // Use your own domain here later
      to: email,
      subject: "Verify your Quiz App Account",
      html: `<p>Click here to verify: <a href="${verifyLink}">${verifyLink}</a></p>`,
    });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Registration successful. Please check your email.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
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
      return res
        .status(403)
        .json({ error: "Please verify your email before logging in." });
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

  const user = await User.findOne({ verificationToken: token });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  // Update user status
  user.isVerified = true;
  user.verificationToken = "";
  await user.save();

  return res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
};
