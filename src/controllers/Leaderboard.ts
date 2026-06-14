import { Request, Response } from "express";
import TestSession from "../models/Testsession";
import Course from "../models/Course";

export const getCourseLeaderboard = async (req: Request, res: Response) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Get best score per student for this course
    const leaderboard = await TestSession.aggregate([
      {
        $match: {
          courseId: course._id,
          status: "completed",
          passed: true,
        },
      },
      {
        $group: {
          _id: "$studentId",
          bestScore: { $max: "$score" },
          attempts: { $sum: 1 },
          lastAttempt: { $max: "$createdAt" },
        },
      },
      { $sort: { bestScore: -1, lastAttempt: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $project: {
          bestScore: 1,
          attempts: 1,
          // Only show first name + last initial for privacy
          //  "student.name": 1,
          displayName: {
            $concat: [
              { $arrayElemAt: [{ $split: ["$student.name", " "] }, 0] },
              " ",
              {
                $substr: [
                  { $arrayElemAt: [{ $split: ["$student.name", " "] }, 1] },
                  0,
                  1,
                ],
              },
              ".",
            ],
          },
        },
      },
    ]);
//  const formatted = results.map((r: any, index: number) => {
    //   const nameParts = r.student.name.trim().split(" ");
    //   const displayName =
    //     nameParts.length > 1
    //       ? `${nameParts[0]} ${nameParts[1][0]}.`
    //       : nameParts[0];

    //   return {
    //     rank: index + 1,
    //     displayName,
    //     bestScore: r.bestScore,
    //     attempts: r.attempts,
    //     lastAttempt: r.lastAttempt,
    //   };
    // });
    return res.json({ course: course.title, leaderboard });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

