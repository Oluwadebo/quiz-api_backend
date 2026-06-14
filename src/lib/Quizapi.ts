import axios from "axios";
import "dotenv/config";
const API_KEY = process.env.QUIZAPI_KEY;
const BASE_URL = "https://quizapi.io/api/v1/questions";

export interface QuizAPIQuestion {
  id: number;
  question: string;
  answers: Record<string, string | null>;
  correct_answer: string;
  difficulty: string;
  tags: { name: string }[];
  correct_answers: Record<string, string>;
}

export interface APIAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

const topicTagMap: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
};

const levelDifficultyMap: Record<string, string> = {
  beginner: "EASY",
  intermediate: "MEDIUM",
  advanced: "HARD",
};

/**
 * Fetches questions from QuizAPI.
 * Uses query parameter 'api_key' as required by the API.
 */
export async function fetchQuestions(
  topic: string,
  level: string,
  limit: number,
) {
  if (!API_KEY) {
    throw new Error("QUIZAPI_KEY is missing from environment variables.");
  }

  try {
    const tag = topicTagMap[topic.toLowerCase()] || topic;
    const difficulty = levelDifficultyMap[level.toLowerCase()] || "EASY";

    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        tags: tag,
        difficulty: difficulty,
        limit: limit,
      },
    });
    // console.log("Raw API Response:", JSON.stringify(response.data, null, 2));
    const rawData = response.data;
    const data: QuizAPIQuestion[] = Array.isArray(rawData)
      ? rawData
      : rawData.data || [];

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No questions returned from QuizAPI");
    }
    return data.map((q: any) => {
      const answers = q.answers || [];
      const correctAnswer = answers.find((a: any) => a.isCorrect)?.id || "";

      const validOptions = answers.map((a: any) => ({
        key: a.id,
        value: a.text,
      }));

      return {
        questionId: String(q.id),
        question: q.text, // ← new format uses 'text' not 'question'
        options: validOptions,
        correctAnswer,
        shuffledOptions: shuffleOptions(validOptions),
      };
    });
  } catch (error) {
    console.error("[QuizAPI] Failed to fetch questions:", error);
    throw new Error("Failed to fetch questions from QuizAPI");
  }
}

/**
 * Fisher-Yates shuffle to randomize answer order
 */
export function shuffleOptions<T>(arr: T[]): T[] {
  if (!Array.isArray(arr)) {
    console.error("shuffleOptions received invalid input:", arr);
    return [];
  }

  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
