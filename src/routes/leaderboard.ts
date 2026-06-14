
import { Router } from "express";
import { getCourseLeaderboard } from "../controllers/Leaderboard";

const router = Router();

router.get("/:courseId", getCourseLeaderboard);

export default router;
