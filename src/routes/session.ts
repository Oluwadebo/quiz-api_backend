import { Router } from "express";
import { startTest, getOngoingSession, submitTest, trackTabSwitch, getHistory,getSession  } from "../controllers/Session";
import { authenticate } from "../middleware/Auth";

const router = Router();

router.post("/start", authenticate, startTest);
router.get("/ongoing", authenticate, getOngoingSession);
router.post("/:sessionId/submit", authenticate, submitTest);
router.post("/:sessionId/tab-switch", authenticate, trackTabSwitch);
router.get("/history", authenticate, getHistory);
router.get("/:sessionId", authenticate, getSession);

export default router;