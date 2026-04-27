import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";

const createSessionSchema = z.object({
  profileId: z.string().min(1),
  language: z.enum(["de", "en"]),
  mode: z.enum(["daily", "free"]),
});

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, createSessionSchema);
    if (isErrorResponse(data)) return data;

    const profile = await prisma.profile.findUnique({
      where: { id: data.profileId },
    });
    if (!profile) {
      return errorResponse(ErrorCode.NOT_FOUND, "Profile not found");
    }

    const session = await prisma.session.create({
      data: {
        profileId: data.profileId,
        language: data.language,
        mode: data.mode,
      },
    });

    return successResponse(session, 201);
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to create session");
  }
}
