
import { Router } from "express";
import { getAllCourses, getCourseWithTests } from "../controllers/course";
import { authenticate } from "../middleware/Auth";

const router = Router();

router.get("/", getAllCourses);
router.get("/:id", authenticate, getCourseWithTests);

export default router;
