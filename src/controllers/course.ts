import { Request, Response } from "express";
import Course from "../models/Course";
import Test from "../models/Test";
import TestSession from "../models/Testsession";

export const getAllCourses = async (_req: Request, res: Response) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ order: 1 });
    return res.json(courses);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch courses" });
  }
};

export const getCourseWithTests = async (req: any, res: Response) => {
  const { id } = req.params;
  const studentId = req.userId;
  try {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    const tests = await Test.find({ courseId: id, isActive: true }).sort({
      order: 1,
    });

    // Check which levels student has passed
    const passedLevels: string[] = [];
    if (studentId) {
      const passedSessions = await TestSession.find({
        studentId,
        courseId: id,
        status: "completed",
        passed: true,
      });
      // .populate("testId");
      passedSessions.forEach((s: any) => {
        // get level from test
        // if (s.testId?.level) passedLevels.push(s.testId.level);

      });

      // Get passed test levels
      const passedTestIds = passedSessions.map((s: any) => s.testId.toString());
      const passedTests = tests.filter((t) =>
        passedTestIds.includes(t._id.toString()),
      );
      passedTests.forEach((t) => passedLevels.push(t.level));
    }

    // Add unlock status to each test
    const testsWithStatus = tests.map((test) => {
      let unlocked = false;
      if (test.level === "beginner") unlocked = true;
      if (test.level === "intermediate")
        unlocked = passedLevels.includes("beginner");
      if (test.level === "advanced")
        unlocked = passedLevels.includes("intermediate");

      return { ...test.toObject(), unlocked };
    });

    return res.json({ course, tests: testsWithStatus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch course" });
  }
};
