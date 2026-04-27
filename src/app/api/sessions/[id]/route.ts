import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        exerciseResults: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return errorResponse(ErrorCode.NOT_FOUND, "Session not found");
    }

    return successResponse(session);
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to fetch session");
  }
}
