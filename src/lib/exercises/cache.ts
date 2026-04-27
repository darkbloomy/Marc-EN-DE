import type { ExerciseBatch } from "./types";

interface CacheEntry {
  batch: ExerciseBatch;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cache = new Map<string, CacheEntry>();

export function getCached(key: string): ExerciseBatch | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.batch;
}

export function setCache(key: string, batch: ExerciseBatch): void {
  cache.set(key, {
    batch,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearCache(): void {
  cache.clear();
}
