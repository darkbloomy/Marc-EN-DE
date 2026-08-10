import Anthropic from "@anthropic-ai/sdk";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import type { AuthClient } from "google-auth-library";

type AIClient = Anthropic | AnthropicVertex;

const globalForAnthropic = globalThis as unknown as {
  anthropic: AIClient | undefined;
};

// Vertex mode mirrors the Claude Code CLI env conventions. When set (e.g. the
// Tesla "bottlerocket" proxy in .env), we route the SDK through the Vertex
// endpoint instead of the direct Anthropic API.
function isVertexEnabled(): boolean {
  return (
    process.env.CLAUDE_CODE_USE_VERTEX === "1" ||
    !!process.env.ANTHROPIC_VERTEX_BASE_URL
  );
}

function createVertexClient(): AnthropicVertex {
  const baseURL = process.env.ANTHROPIC_VERTEX_BASE_URL;
  const region = process.env.CLOUD_ML_REGION || "global";
  const projectId = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;

  // CLAUDE_CODE_SKIP_VERTEX_AUTH=1 means the proxy authenticates via a static
  // bearer token instead of Google ADC. AnthropicVertex's `accessToken` option
  // is accepted but never applied to headers, so we inject the token through a
  // minimal `authClient` whose getRequestHeaders() returns the Authorization
  // header (the SDK merges it via buildHeaders, which accepts a plain Record).
  const skipAuth = process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH === "1";
  const authClient =
    skipAuth && authToken
      ? ({
          getRequestHeaders: async () => ({
            Authorization: `Bearer ${authToken}`,
          }),
        } as unknown as AuthClient)
      : undefined;

  return new AnthropicVertex({
    baseURL,
    region,
    projectId,
    ...(authClient ? { authClient } : {}),
  });
}

function createClient(): AIClient {
  if (isVertexEnabled()) {
    return createVertexClient();
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

export function getAnthropicClient(): AIClient {
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = createClient();
  }
  return globalForAnthropic.anthropic;
}

export const AI_MODEL =
  process.env.ANTHROPIC_MODEL ||
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
  "claude-3-5-sonnet-20241022";
export const MAX_TOKENS = 4096;
