
import { Router } from "express";
import { authenticate,adminOnly } from "../middleware/Auth";

import {
  createCourse, updateCourse, deleteCourse,
  createTest, updateTest, deleteTest,
  getAllResults, getAllStudents, getDashboardStats,
} from "../controllers/admin";

const router = Router();

router.use(authenticate, adminOnly);

// Courses
router.post("/courses", createCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);

// Tests
router.post("/tests", createTest);
router.put("/tests/:id", updateTest);
router.delete("/tests/:id", deleteTest);

// Results & Students
router.get("/results", getAllResults);
router.get("/students", getAllStudents);
router.get("/stats", getDashboardStats);

export default router;