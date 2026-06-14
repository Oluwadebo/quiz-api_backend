import { Response } from "express";
import { fetchQuestions } from "../lib/Quizapi";
import Course from "../models/Course";
import Test from "../models/Test";
import TestSession from "../models/Testsession";

// ─── Check attempts this week ──────────────────────
const getAttemptsThisWeek = async (studentId: string, testId: string) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return await TestSession.countDocuments({
    studentId,
    testId,
    createdAt: { $gte: weekAgo },
  });
};

// ─── Start test ────────────────────────────────────
export const startTest = async (req: any, res: Response) => {
  const { testId } = req.body;
  const studentId = req.userId;

  try {
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ error: "Test not found" });

    const course = await Course.findById(test.courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Check if student has an ongoing session for this test
    const ongoing = await TestSession.findOne({
      studentId,
      testId,
      status: "ongoing",
    });
    if (ongoing) {
      // Check if time has expired
      const elapsed = (Date.now() - ongoing.startTime.getTime()) / 1000 / 60;
      if (elapsed >= ongoing.timeLimit) {
        await autoSubmit(ongoing._id.toString());
        return res
          .status(400)
          .json({ error: "Previous session expired and submitted" });
      }
      return res.json({ session: ongoing, resumed: true });
    }

    // Check weekly attempt limit (unlimited for advanced)
    if (test.level !== "advanced") {
      const attempts = await getAttemptsThisWeek(studentId, testId);
      if (attempts >= test.maxAttemptsPerWeek) {
        return res.status(429).json({
          error: `Maximum ${test.maxAttemptsPerWeek} attempts per week reached for this test`,
        });
      }
    }

    // Check 12 hour cooldown
    const lastSession = await TestSession.findOne(
      { studentId, testId },
      {},
      { sort: { createdAt: -1 } },
    );
    if (lastSession) {
      const hoursSince =
        (Date.now() - lastSession.createdAt.getTime()) / 1000 / 3600;
      if (hoursSince < 12) {
        const hoursLeft = Math.ceil(12 - hoursSince);
        return res.status(429).json({
          error: `Please wait ${hoursLeft} more hour(s) before retaking`,
        });
      }
    }

    // Fetch questions from QuizAPI
    const rawQuestions = await fetchQuestions(
      course.topic,
      test.level,
      test.questionCount,
    );

    // Format and shuffle options
    const questions = rawQuestions.map((q: any) => ({
      id: q.questionId,
      questionId: q.questionId,
      question: q.question,
      answers: q.answers,
      correctAnswer: q.correctAnswer,
      // shuffledOptions: shuffleOptions(q.answers),
      shuffledOptions: q.shuffledOptions,
    }));

    const attemptNumber =
      (await TestSession.countDocuments({ studentId, testId })) + 1;

    const session = await TestSession.create({
      studentId,
      testId,
      courseId: test.courseId,
      questions,
      timeLimit: test.timeLimit,
      attemptNumber,
      status: "ongoing",
    });

    // Return questions WITHOUT correct answers
    const safeSession = {
      ...session.toObject(),
      questions: session.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        shuffledOptions: q.shuffledOptions,
        // correctAnswer is NOT sent to frontend
      })),
    };

    return res.status(201).json({ session: safeSession });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to start test" });
  }
};

// ─── Get ongoing session ───────────────────────────
export const getOngoingSession = async (req: any, res: Response) => {
  try {
    const session = await TestSession.findOne({
      studentId: req.userId,
      status: "ongoing",
    });

    if (!session) return res.json({ session: null });

    // Check if expired
    const elapsed = (Date.now() - session.startTime.getTime()) / 1000 / 60;
    if (elapsed >= session.timeLimit) {
      await autoSubmit(session._id.toString());
      return res.json({
        session: null,
        message: "Session expired and submitted",
      });
    }

    const timeRemaining = Math.max(
      0,
      session.timeLimit * 60 -
        Math.floor((Date.now() - session.startTime.getTime()) / 1000),
    );

    const safeSession = {
      ...session.toObject(),
      timeRemaining,
      questions: session.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        shuffledOptions: q.shuffledOptions,
      })),
    };

    return res.json({ session: safeSession });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch session" });
  }
};

// ─── Submit test ───────────────────────────────────
export const submitTest = async (req: any, res: Response) => {
  const { sessionId } = req.params;
  const { answers } = req.body; // [{ questionId, selectedAnswer }]

  try {
    const session = await TestSession.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.studentId.toString() !== req.userId)
      return res.status(403).json({ error: "Forbidden" });
    if (session.status !== "ongoing")
      return res.status(400).json({ error: "Session already completed" });

    const test = await Test.findById(session.testId);
    if (!test) return res.status(404).json({ error: "Test not found" });

    // Grade answers
    let correct = 0;
    const gradedAnswers = answers.map(
      (a: { questionId: string; selectedAnswer: string }) => {
        const question = session.questions.find(
          (q: any) => q.id === a.questionId,
        );
        const isCorrect =
          question && a.selectedAnswer === question.correctAnswer;
        if (isCorrect) correct++;
        return {
          questionId: a.questionId,
          selectedAnswer: a.selectedAnswer,
          correctAnswer: question?.correctAnswer || "",
          isCorrect: !!isCorrect,
        };
      },
    );

    const score = Math.round((correct / session.questions.length) * 100);
    const passed = score >= test.passMark;

    await TestSession.findByIdAndUpdate(sessionId, {
      answers: gradedAnswers,
      score,
      passed,
      status: "completed",
      endTime: new Date(),
      questions: [], // clear questions after grading
    });

    return res.json({
      score,
      passed,
      correct,
      total: session.questions.length,
      passMark: test.passMark,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to submit test" });
  }
};

// ─── Track tab switch ──────────────────────────────
export const trackTabSwitch = async (req: any, res: Response) => {
  const { sessionId } = req.params;
  try {
    const session = await TestSession.findByIdAndUpdate(
      sessionId,
      { $inc: { tabSwitchCount: 1 } },
      { new: true },
    );
    // Auto submit if too many tab switches
    if (session && session.tabSwitchCount >= 3) {
      await autoSubmit(sessionId);
      return res.json({
        warning: "Too many tab switches — test auto submitted",
      });
    }
    return res.json({ tabSwitchCount: session?.tabSwitchCount });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

// ─── Get student history ───────────────────────────
export const getHistory = async (req: any, res: Response) => {
  try {
    const sessions = await TestSession.find({
      studentId: req.userId,
      status: "completed",
    })
      .populate("testId", "title level passMark")
      .populate("courseId", "title topic")
      .sort({ createdAt: -1 });

    return res.json(sessions);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }
};

// ─── Auto submit helper ────────────────────────────
const autoSubmit = async (sessionId: string) => {
  const session = await TestSession.findById(sessionId);
  if (!session || session.status !== "ongoing") return;

  const test = await Test.findById(session.testId);
  if (!test) return;

  const correct = session.answers.filter((a: any) => a.isCorrect).length;
  const total = session.questions.length || 1;
  const score = Math.round((correct / total) * 100);
  const passed = score >= test.passMark;

  await TestSession.findByIdAndUpdate(sessionId, {
    score,
    passed,
    status: "expired",
    endTime: new Date(),
    questions: [],
  });
};
