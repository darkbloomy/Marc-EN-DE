import { z } from "zod/v4";
import { lookupWord } from "@/lib/ai/dictionary";
import {
  errorResponse,
  ErrorCode,
  isErrorResponse,
  successResponse,
  validateBody,
} from "@/lib/api-response";

const lookupSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "word is required")
    .max(40, "word is too long")
    .regex(/^[\p{L}\p{M}'’-]+$/u, "word must contain letters only"),
  language: z.enum(["de", "en"]),
  context: z.string().trim().max(300).optional(),
});

export async function POST(request: Request) {
  const body = await validateBody(request, lookupSchema);
  if (isErrorResponse(body)) return body;

  try {
    const result = await lookupWord({
      word: body.word,
      language: body.language,
      context: body.context || undefined,
    });
    return successResponse(result);
  } catch (error) {
    console.error("dictionary lookup failed:", error instanceof Error ? error.message : error);
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Dictionary unavailable right now. Please try again later.",
      503,
    );
  }
}
