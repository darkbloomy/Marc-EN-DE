import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, ErrorCode } from "@/lib/api-response";

export async function GET() {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: "asc" }, { threshold: "asc" }],
    });
    return successResponse(achievements);
  } catch {
    return errorResponse(
      ErrorCode.SERVER_ERROR,
      "Failed to fetch achievements"
    );
  }
}
