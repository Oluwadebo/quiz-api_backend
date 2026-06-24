import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

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

const GEMINI_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.0-pro",
];
export async function fetchQuestions(
  topic: string,
  level: string,
  limit: number,
) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  let lastError: any;
  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" },
      });
      const prompt = `Generate ${limit} multiple-choice questions about ${topic} for a ${level} level audience. Return ONLY a JSON array of objects. Each object MUST have:{  "id": "1",  "question": "...",  "options": [{"key": "a", "value": "Option A"}, {"key": "b", "value": "Option B"}, {"key": "c", "value": "Option C"}, {"key": "d", "value": "Option D"}],  "correctAnswer": "a" } ||  Format: [{"id": "1", "question": "...", "options": [...], "correctAnswer": "a"}]`;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const data = JSON.parse(
        responseText.replace(/```json/g, "").replace(/```/g, ""),
      );
      return data.map((q: any) => ({
        id: String(q.id),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        shuffledOptions: shuffleOptions(q.options),
      }));
    } catch (error: any) {
      console.error(`[${modelName} failed]:`, error?.status || error?.message);
      lastError = error;
      if (error?.status !== 503) throw error;
       throw new Error("Failed to generate questions with Gemini");
    }
  }
  throw new Error(`All Gemini models failed: ${lastError?.message}`);
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
