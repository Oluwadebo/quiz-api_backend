import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { z } from "zod";
import Settings from "../models/Setting";
import User from "../models/User";

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
  subject: `[${siteName}] Verify your email address`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#080C14;">

<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#080C14;background-image:linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px);background-size:60px 60px;padding:40px 24px;min-height:100vh;">
  <tr><td align="center">
    <table width="384" cellpadding="0" cellspacing="0" style="font-family:'Courier New',Courier,monospace;">

      <!-- Brand header -->
      <tr>
        <td style="text-align:center;padding-bottom:28px;">
          <div style="font-size:13px;letter-spacing:.2em;color:#3B82F6;">${siteName.toUpperCase()}</div>
          <div style="font-size:10px;letter-spacing:.2em;color:#334155;margin-top:4px;">VERIFY YOUR EMAIL ADDRESS</div>
        </td>
      </tr>

      <!-- Card -->
      <tr>
        <td style="background:#0D1220;border:1px solid rgba(255,255,255,0.05);padding:28px 32px;">

          <!-- Action badge -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="border-left:2px solid #3B82F6;padding-left:12px;">
                <div style="font-size:10px;letter-spacing:.2em;color:#3B82F6;">ACTION REQUIRED</div>
                <div style="font-size:10px;color:#334155;margin-top:4px;line-height:1.6;">CONFIRM YOUR EMAIL TO ACTIVATE YOUR ACCOUNT.</div>
              </td>
            </tr>
          </table>

          <!-- To field -->
          <div style="margin-bottom:20px;">
            <div style="font-size:10px;letter-spacing:.15em;color:#475569;margin-bottom:6px;">TO</div>
            <div style="font-size:11px;color:#94A3B8;">${email}</div>
          </div>

          <!-- Body -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="background:#111827;border:1px solid rgba(255,255,255,0.05);padding:12px;font-size:10px;color:#334155;line-height:1.8;">
                Hi there,<br><br>
                Click the button below to verify your email address and activate your ${siteName} account.
                This link expires in <span style="color:#3B82F6;">24 hours</span>.
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td align="center">
                <a href="${verifyLink}"
                   style="display:inline-block;width:100%;box-sizing:border-box;text-align:center;padding:10px;background:#3B82F6;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:.2em;text-decoration:none;">
                  VERIFY MY EMAIL &rarr;
                </a>
              </td>
            </tr>
          </table>

          <!-- Fallback link -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;">
            <tr>
              <td>
                <div style="font-size:10px;letter-spacing:.1em;color:#334155;margin-bottom:8px;">OR COPY THIS LINK</div>
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.05);padding:8px;">
                  <a href="${verifyLink}" style="font-size:9px;color:#3B82F6;word-break:break-all;text-decoration:none;line-height:1.6;">${verifyLink}</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding-top:12px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:10px;color:#334155;">DIDN'T REQUEST THIS? IGNORE IT.</td>
              <td align="right">
                <span style="font-size:10px;color:#1D4ED8;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);padding:3px 10px;">24H EXPIRY</span>
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

    console.log(
      `${siteName} through ${process.env.EMAIL_USER} Attempting to send verification to: ${email}`,
    );

    return res.status(201).json({
      // token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message:
        "Registration successful. Please check your email. So as to login.",
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
      return res.status(403).json({
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
