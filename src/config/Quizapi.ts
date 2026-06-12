import axios from "axios";

const QUIZAPI_BASE = "https://quizapi.io/api/v1";
const API_KEY = process.env.QUIZAPI_KEY;

interface QuizAPIQuestion {
  id: number;
  question: string;
  answers: Record<string, string | null>;
  correct_answer: string;
  difficulty: string;
  tags: { name: string }[];
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
  limit: number
) {
  try {
    const { data } = await axios.get<QuizAPIQuestion[]>(
      `${QUIZAPI_BASE}/questions`,
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