import { Request, Response } from "express";
import Course from "../models/Course";
import Test from "../models/Test";
import TestSession from "../models/Testsession";
import User from "../models/User";

// ─── Courses ───────────────────────────────────────
export const createCourse = async (req: Request, res: Response) => {
  const { title, description, topic, order } = req.body;
  if (!title || !description || !topic) {
    return res.status(400).json({ error: "title, description and topic required" });
  }
  try {
    const course = await Course.create({ title, description, topic, order });
    return res.status(201).json(course);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create course" });
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true });
    if (!course) return res.status(404).json({ error: "Course not found" });
    return res.json(course);
  } catch (err) {
    return res.status(500).json({ error: "Failed to update course" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await Course.findByIdAndDelete(id);
    await Test.deleteMany({ courseId: id });
    return res.json({ message: "Course and tests deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete course" });
  }
};

// ─── Tests ─────────────────────────────────────────
export const createTest = async (req: Request, res: Response) => {
  const { courseId, title, level, questionCount, timeLimit, passMark, maxAttemptsPerWeek, order } = req.body;
  if (!courseId || !title || !level) {
    return res.status(400).json({ error: "courseId, title and level required" });
  }
  try {
    const test = await Test.create({
      courseId, title, level, questionCount, timeLimit, passMark, maxAttemptsPerWeek, order,
    });
    return res.status(201).json(test);
  } catch (err) {
    return res.status(500).json({ error: "Failed to create test" });
  }
};

export const updateTest = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    title,
    level,
    questionCount,
    timeLimit,
    passMark,
    maxAttemptsPerWeek,
    isActive,
    order
  } = req.body;
  try {
    const test = await Test.findByIdAndUpdate(
      id,
      {
        title,
        level,
        questionCount,
        timeLimit,
        passMark,
        maxAttemptsPerWeek,
        isActive,
        order
      },
      {
        returnDocument: 'after',
        runValidators: true
      }
    );
    if (!test) return res.status(404).json({ error: "Test not found" });
    return res.json(test);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update test" });
  }
};

export const deleteTest = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await Test.findByIdAndDelete(id);
    return res.json({ message: "Test deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete test" });
  }
};

// ─── Results & Students ────────────────────────────
export const getAllResults = async (_req: Request, res: Response) => {
  try {
    const results = await TestSession.find({ status: { $in: ["completed", "expired"] } })
      .populate("studentId", "name email")
      .populate("testId", "title level")
      .populate("courseId", "title")
      .sort({ createdAt: -1 });
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch results" });
  }
};

export const getAllStudents = async (_req: Request, res: Response) => {
  try {
    const students = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });
    return res.json(students);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch students" });
  }
};

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [totalStudents, totalCourses, totalTests, totalSessions, passedSessions] = await Promise.all([
      User.countDocuments({ role: "student" }),
      Course.countDocuments({ isActive: true }),
      Test.countDocuments({ isActive: true }),
      TestSession.countDocuments({ status: "completed" }),
      TestSession.countDocuments({ status: "completed", passed: true }),
    ]);

    const passRate = totalSessions > 0
      ? Math.round((passedSessions / totalSessions) * 100)
      : 0;

    return res.json({ totalStudents, totalCourses, totalTests, totalSessions, passedSessions, passRate });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};
