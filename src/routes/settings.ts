
import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings";
import { authenticate, adminOnly } from "../middleware/Auth";

const router = Router();

router.get("/", getSettings);
router.put("/", authenticate, adminOnly, updateSettings);

export default router;