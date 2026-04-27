import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { updateProfileSchema } from "@/lib/validations";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: { id: true, name: true, avatarId: true, createdAt: true },
    });
    if (!profile) {
      return errorResponse(ErrorCode.NOT_FOUND, "Profile not found");
    }
    return successResponse(profile);
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to fetch profile");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.profile.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(ErrorCode.NOT_FOUND, "Profile not found");
    }

    const data = await validateBody(request, updateProfileSchema);
    if (isErrorResponse(data)) return data;

    const profile = await prisma.profile.update({
      where: { id },
      data,
      select: { id: true, name: true, avatarId: true },
    });
    return successResponse(profile);
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to update profile");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.profile.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(ErrorCode.NOT_FOUND, "Profile not found");
    }

    await prisma.profile.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch {
    return errorResponse(ErrorCode.SERVER_ERROR, "Failed to delete profile");
  }
}
