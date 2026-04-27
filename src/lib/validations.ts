import { z } from "zod/v4";

export const createProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(30, "Name must be at most 30 characters"),
  avatarId: z.string().min(1, "Avatar is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(30, "Name must be at most 30 characters").optional(),
  avatarId: z.string().min(1, "Avatar is required").optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
