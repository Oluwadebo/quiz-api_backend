import { Router } from "express";
import { register, login, getMe,verifyEmail } from "../controllers/auth";
import { authenticate } from "../middleware/Auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.get("/verify", verifyEmail);

export default router;
