import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User";
import Settings from "../models/Setting";
import nodemailer from "nodemailer";

// Create the transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // e.g., your-email@gmail.com
    pass: process.env.EMAIL_PASS, // IMPORTANT: Use an App Password, not your normal password
  },
});

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

    const settings = await Settings.findOne({});
    const siteName = settings?.platformName || "QuizHub";
    const verifyLink = `${process.env.BACKEND_URL}/api/auth/verify?token=${verificationToken}`;

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    // const resend = getResendClient();


    await transporter.sendMail({
  from: `"${siteName}" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: `Verify your ${siteName} account`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#0F0F0F;border-radius:16px;overflow:hidden;border:1px solid rgba(108,71,255,0.15);">

      <!-- Header -->
      <tr>
        <td style="background:#131320;padding:32px 40px 28px;text-align:center;border-bottom:1px solid rgba(108,71,255,0.15);">
          <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#6C47FF,#9B7BFF);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <!-- Replace with your logo -->
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style="font-size:13px;font-weight:500;color:#E8E0FF;letter-spacing:0.08em;text-transform:uppercase;">${siteName}</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;">
          <p style="font-size:26px;color:#F7F7F5;margin:0 0 14px;line-height:1.3;font-family:Georgia,serif;">
            Confirm your email address
          </p>
          <p style="font-size:14px;line-height:1.7;color:#9E9E9E;margin:0 0 28px;">
            You're one step away. Click the button below to verify your address and activate your account.
            This link expires in 24 hours.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td align="center">
              <a href="${verifyLink}"
                 style="display:inline-block;background:#6C47FF;color:#ffffff;font-size:15px;font-weight:500;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
                Verify my email
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 24px;">

          <p style="font-size:12px;color:#666666;margin:0 0 8px;">Or paste this link into your browser:</p>
          <a href="${verifyLink}" style="font-size:12px;color:#6C47FF;word-break:break-all;text-decoration:none;">${verifyLink}</a>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;color:#555555;">If you didn't create an account, ignore this email.</td>
              <td align="right">
                <span style="font-size:11px;color:#9B7BFF;background:rgba(108,71,255,0.12);padding:4px 10px;border-radius:20px;">Expires in 24 h</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>

</body>
</html>
  `,
});

 console.log(`${siteName} through ${process.env.EMAIL_USER} Attempting to send verification to: ${email}`);
 
    return res.status(201).json({
      // token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "Registration successful. Please check your email. So as to login.",
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
        .json({
          error:
            "Your account is not verified. Please check your email! and verify, so you can login.",
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
