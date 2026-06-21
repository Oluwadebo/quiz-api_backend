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

export async function fetchQuestions(
  topic: string,
  level: string,
  limit: number,
) {
  console.log("DEBUG: Checking API Key existence:", !!process.env.GEMINI_API_KEY);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  const model = genAI.getGenerativeModel({
    model: "gemini-3.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `Generate ${limit} multiple-choice questions about ${topic} for a ${level} level audience.
    Return ONLY a JSON array of objects.
    Each object MUST have:
    {
      "id": "1",
      "question": "...",
      "options": [{"key": "a", "value": "Option A"}, {"key": "b", "value": "Option B"}, {"key": "c", "value": "Option C"}, {"key": "d", "value": "Option D"}],
      "correctAnswer": "a"
    }  ||  Format: [{"id": "1", "question": "...", "options": [...], "correctAnswer": "a"}]`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    // const data = JSON.parse(responseText);
    const data = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, ""));

    // Map to your existing format
    return data.map((q: any) => ({
      id: String(q.id),
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      shuffledOptions: shuffleOptions(q.options),
    }));
  } catch (error) {
    console.error("[Gemini Generation Error]:", error);
    throw new Error("Failed to generate questions with Gemini");
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
