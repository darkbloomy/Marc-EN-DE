import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

export function getAnthropicClient(): Anthropic {
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = createClient();
  }
  return globalForAnthropic.anthropic;
}

export const AI_MODEL = "claude-sonnet-4-20250514";
export const MAX_TOKENS = 2048;
