import mongoose, { Document, Schema, UpdateQuery } from "mongoose";

export interface ITest extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  level: "beginner" | "intermediate" | "advanced";
  questionCount: number;
  timeLimit: number;
  passMark: number;
  difficulty: "Easy" | "Medium" | "Hard";
  maxAttemptsPerWeek: number;
  isActive: boolean;
  order: number;
  createdAt: Date;
}

const TestSchema = new Schema<ITest>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    title: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    questionCount: { type: Number, default: 20 },
    timeLimit: { type: Number, default: 15 }, // minutes
    passMark: { type: Number, default: 70 }, // percentage
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },
    maxAttemptsPerWeek: { type: Number, default: 3 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // 1=beginner, 2=intermediate, 3=advanced
  },
  { timestamps: true },
);
const getDifficulty = (level: string) => {
  return level === "advanced" ? "Hard" : level === "intermediate" ? "Medium" : "Easy";
};
TestSchema.pre("save",async function () {
  this.difficulty = getDifficulty(this.level);
});
TestSchema.pre("findOneAndUpdate",async function () {
  const update = this.getUpdate() as any;

  const level = update.level || (update.$set && update.$set.level);
  if (level) {
    const newDifficulty = getDifficulty(level);
    if (update.$set) {
      update.$set.difficulty = newDifficulty;
    } else {
      update.difficulty = newDifficulty;
    }
  }

});

export default mongoose.model<ITest>("Test", TestSchema);
