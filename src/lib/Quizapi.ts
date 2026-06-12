import axios from "axios";

const QUIZAPI_BASE = "https://quizapi.io/api/v1/questions";
const API_KEY = process.env.QUIZAPI_KEY;

export interface QuizAPIQuestion {
  id: number;
  question: string;
  answers: Record<string, string | null>;
  correct_answer: string;
  difficulty: string;
  tags: { name: string }[];
  correct_answers: Record<string, string>;
}

// ─── Shuffle array helper ───────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Fetch questions from QuizAPI ───────────────────
export async function fetchQuestions(
  topic: string,
  difficulty: string,
  limit: number,
   level: string,
  count: number
) {
  try {
    const tag = topicTagMap[topic] || topic;
  const difficulty = levelDifficultyMap[level] || "Easy";
    const { data } = await axios.get<QuizAPIQuestion[]>(
      `${QUIZAPI_BASE}`,
      {
        params: {
          apiKey: API_KEY,
          tags: topic,
          difficulty,
          limit,
        },
      }
    );

    // Format and shuffle options for each question
    return data.map((q) => {
      // Filter out null options
      const validOptions = Object.entries(q.answers)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => ({ key, value: value as string }));

      // Shuffle options — anti-cheat
      const shuffledOptions = shuffleArray(validOptions);

      return {
        questionId: String(q.id),
        question: q.question,
        options: q.answers,
        correctAnswer: q.correct_answer,
        shuffledOptions,
      };
    });
  } catch (error) {
    console.error("[QuizAPI] Failed to fetch questions:", error);
    throw new Error("Failed to fetch questions from QuizAPI");
  }
}


const topicTagMap: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
};

// Map our level names to QuizAPI difficulty
const levelDifficultyMap: Record<string, string> = {
  beginner: "Easy",
  intermediate: "Medium",
  advanced: "Hard",
};




// Shuffle answer options to prevent cheating
export const shuffleOptions = (
  answers: Record<string, string | null>
): { key: string; value: string }[] => {
  const options = Object.entries(answers)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => ({ key, value: value as string }));

  // Fisher-Yates shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
};