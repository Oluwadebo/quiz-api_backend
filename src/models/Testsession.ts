import mongoose, { Document, Schema } from "mongoose";

interface IQuestion {
  questionId: string; // QuizAPI question id
  question: string;
  options: Record<string, string | null>; // { a: "option1", b: "option2", ... }
  correctAnswer: string; // kept server side only
  shuffledOptions: { key: string; value: string }[]; // shuffled for display
}

interface IAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface ITestSession extends Document {
  studentId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  questions: IQuestion[];
  answers: IAnswer[];
  score: number;
  passed: boolean;
  startTime: Date;
  endTime?: Date;
  timeLimit: number; // in minutes, copied from test
  status: "ongoing" | "completed" | "expired";
  attemptNumber: number;
  tabSwitchCount: number; // anti-cheat
}

const TestSessionSchema = new Schema<ITestSession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    questions: [
      {
        questionId: String,
        question: String,
        options: { type: Schema.Types.Mixed },
        correctAnswer: String,
        shuffledOptions: [{ key: String, value: String }],
      },
    ],
    answers: [
      {
        questionId: String,
        questionText: String,
        selectedAnswer: String,
        selectedAnswerText: String,
        correctAnswer: String,
        correctAnswerText: String,
        isCorrect: Boolean,
      },
    ],
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    timeLimit: { type: Number, required: true },
    status: {
      type: String,
      enum: ["ongoing", "completed", "expired"],
      default: "ongoing",
    },
    attemptNumber: { type: Number, default: 1 },
    tabSwitchCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model<ITestSession>("TestSession", TestSessionSchema);
