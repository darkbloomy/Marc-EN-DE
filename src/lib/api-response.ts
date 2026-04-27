import { NextResponse } from "next/server";
import { z } from "zod/v4";

// Error code constants
export const ErrorCode = {
  INVALID_INPUT: "INVALID_INPUT",
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function errorResponse(
  code: ErrorCodeType,
  message: string,
  status?: number
) {
  const statusCode =
    status ??
    {
      [ErrorCode.INVALID_INPUT]: 400,
      [ErrorCode.NOT_FOUND]: 404,
      [ErrorCode.FORBIDDEN]: 403,
      [ErrorCode.CONFLICT]: 409,
      [ErrorCode.SERVER_ERROR]: 500,
    }[code];

  return NextResponse.json(
    { success: false as const, error: { code, message } },
    { status: statusCode }
  );
}

export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T | NextResponse> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => issue.message)
        .join(", ");
      return errorResponse(ErrorCode.INVALID_INPUT, message);
    }
    return result.data;
  } catch {
    return errorResponse(ErrorCode.INVALID_INPUT, "Invalid JSON body");
  }
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
