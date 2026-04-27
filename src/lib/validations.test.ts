import { describe, it, expect } from "vitest";
import { createProfileSchema, updateProfileSchema } from "./validations";

describe("createProfileSchema", () => {
  it("accepts valid input", () => {
    const result = createProfileSchema.safeParse({ name: "Marc", avatarId: "fox" });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createProfileSchema.safeParse({ name: "M", avatarId: "fox" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 30 characters", () => {
    const result = createProfileSchema.safeParse({ name: "A".repeat(31), avatarId: "fox" });
    expect(result.success).toBe(false);
  });

  it("rejects missing avatarId", () => {
    const result = createProfileSchema.safeParse({ name: "Marc" });
    expect(result.success).toBe(false);
  });

  it("rejects empty avatarId", () => {
    const result = createProfileSchema.safeParse({ name: "Marc", avatarId: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts partial update with only name", () => {
    const result = updateProfileSchema.safeParse({ name: "Marc2" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only avatarId", () => {
    const result = updateProfileSchema.safeParse({ avatarId: "owl" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no updates)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
