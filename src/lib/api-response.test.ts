import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  successResponse,
  errorResponse,
  validateBody,
  isErrorResponse,
  ErrorCode,
} from "./api-response";

describe("successResponse", () => {
  it("returns correct shape with default 200 status", async () => {
    const response = successResponse({ id: "123", name: "Test" });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { id: "123", name: "Test" },
    });
  });

  it("respects custom status code", async () => {
    const response = successResponse({ id: "1" }, 201);
    expect(response.status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("returns correct shape with auto-detected status", async () => {
    const response = errorResponse(ErrorCode.NOT_FOUND, "Profile not found");
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Profile not found" },
    });
  });

  it("maps INVALID_INPUT to 400", async () => {
    const response = errorResponse(ErrorCode.INVALID_INPUT, "Bad input");
    expect(response.status).toBe(400);
  });

  it("maps SERVER_ERROR to 500", async () => {
    const response = errorResponse(ErrorCode.SERVER_ERROR, "Something broke");
    expect(response.status).toBe(500);
  });

  it("allows custom status override", async () => {
    const response = errorResponse(ErrorCode.FORBIDDEN, "No access", 401);
    expect(response.status).toBe(401);
  });
});

describe("validateBody", () => {
  const schema = z.object({
    name: z.string().min(2),
    avatarId: z.string(),
  });

  it("returns parsed data for valid input", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Marc", avatarId: "fox" }),
    });
    const result = await validateBody(request, schema);
    expect(isErrorResponse(result)).toBe(false);
    expect(result).toEqual({ name: "Marc", avatarId: "fox" });
  });

  it("returns error response for invalid input", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "M" }),
    });
    const result = await validateBody(request, schema);
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
      expect(result.status).toBe(400);
    }
  });

  it("returns error response for invalid JSON", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: "not json",
    });
    const result = await validateBody(request, schema);
    expect(isErrorResponse(result)).toBe(true);
  });
});
