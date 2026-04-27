import { GoogleGenerativeAI } from "@google/generative-ai";

const globalForGemini = globalThis as unknown as {
  gemini: GoogleGenerativeAI | undefined;
};

function createClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenerativeAI(apiKey);
}

export function getAIClient(): GoogleGenerativeAI {
  if (!globalForGemini.gemini) {
    globalForGemini.gemini = createClient();
  }
  return globalForGemini.gemini;
}

export const AI_MODEL = "gemini-2.5-flash-preview-05-20";
export const MAX_TOKENS = 2048;
