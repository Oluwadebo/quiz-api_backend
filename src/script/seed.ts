import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "student" },
}, { timestamps: true });

const CourseSchema = new mongoose.Schema({
  title: String,
  description: String,
  topic: String,
  isActive: { type: Boolean, default: true },
  order: Number,
}, { timestamps: true });

const TestSchema = new mongoose.Schema({
  courseId: mongoose.Schema.Types.ObjectId,
  title: String,
  level: String,
  questionCount: Number,
  timeLimit: Number,
  passMark: Number,
  difficulty: String,
  maxAttemptsPerWeek: Number,
  isActive: { type: Boolean, default: true },
  order: Number,
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);
const Course = mongoose.model("Course", CourseSchema);
const Test = mongoose.model("Test", TestSchema);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("[DB] Connected");

  // ─── Admin user ───────────────────────────────────
  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existing) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);
    await User.create({
      name: "Admin",
      email: process.env.ADMIN_EMAIL,
      password: hashed,
      role: "admin",
    });
    console.log(`✅ Admin created: ${process.env.ADMIN_EMAIL}`);
  } else {
    console.log("Admin already exists — skipping");
  }

  // ─── Sample courses ───────────────────────────────
  const courses = [
    { title: "HTML Fundamentals", description: "Learn the building blocks of the web", topic: "html", order: 1 },
    { title: "CSS Styling", description: "Master the art of styling web pages", topic: "css", order: 2 },
    { title: "JavaScript Basics", description: "Learn programming with JavaScript", topic: "javascript", order: 3 },
  ];

  for (const courseData of courses) {
    const existing = await Course.findOne({ topic: courseData.topic });
    if (!existing) {
      const course = await Course.create(courseData);
      console.log(`✅ Course created: ${course.title}`);

      // Create 3 tests per course
      const tests = [
        { level: "beginner", title: `${courseData.title} — Beginner`, questionCount: 10, timeLimit: 10, passMark: 70, difficulty: "Easy", maxAttemptsPerWeek: 3, order: 1 },
        { level: "intermediate", title: `${courseData.title} — Intermediate`, questionCount: 15, timeLimit: 15, passMark: 70, difficulty: "Medium", maxAttemptsPerWeek: 2, order: 2 },
        { level: "advanced", title: `${courseData.title} — Advanced`, questionCount: 20, timeLimit: 20, passMark: 70, difficulty: "Hard", maxAttemptsPerWeek: 999, order: 3 },
      ];

      for (const testData of tests) {
        await Test.create({ ...testData, courseId: course._id });
        console.log(`  ✅ Test created: ${testData.title}`);
      }
    } else {
      console.log(`Course already exists: ${courseData.title} — skipping`);
    }
  }

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => mongoose.disconnect());