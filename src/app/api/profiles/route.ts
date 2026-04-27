import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { createProfileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      select: { id: true, name: true, avatarId: true },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(profiles);
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to fetch profiles");
  }
}

export async function POST(request: Request) {
  try {
    const data = await validateBody(request, createProfileSchema);
    if (isErrorResponse(data)) return data;

    const profile = await prisma.profile.create({
      data: { name: data.name, avatarId: data.avatarId },
      select: { id: true, name: true, avatarId: true },
    });
    return successResponse(profile, 201);
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to create profile");
  }
}
