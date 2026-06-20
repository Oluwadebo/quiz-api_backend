import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./lib/db";

import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import courseRoutes from "./routes/course";
import sessionRoutes from "./routes/session";
import leaderboardRoutes from "./routes/leaderboard";
import adminRoutes from "./routes/admin";
import settingsRoutes from "./routes/settings";

dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;
connectDB();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.ALLOWED_ORIGIN || "",
      process.env.NEXT_PUBLIC_APP_URL || "",
    ].filter(Boolean),
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login/register attempts, please try again in an hour." },
});
app.use("/api/auth", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 handler ───────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global error handler ──────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(500).json({ error: "Internal server error" });
  },
);

if (process.env.NODE_ENV === "production") {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      await fetch(`${SELF_URL}/health`);
      console.log("[Keep-alive] Pinged");
    } catch {}
  }, 10 * 60 * 1000);
}



app.listen(PORT, () => {
  console.log(`\n🚀 Quiz API Backend running on http://localhost:${PORT}`);
});

export default app;
