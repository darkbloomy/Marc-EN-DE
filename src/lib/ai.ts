import Anthropic from "@anthropic-ai/sdk";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import OpenAI from "openai";
import type { AuthClient } from "google-auth-library";

type AnthropicClient = Anthropic | AnthropicVertex;

export type ProviderName = "grok" | "sonnet" | "opus" | "qwen";
export const DEFAULT_PROVIDER_ORDER: ProviderName[] = ["grok", "sonnet", "opus", "qwen"];

export interface ProviderConfig {
  name: ProviderName;
  kind: "anthropic" | "openai";
  model: string;
  baseURL?: string;
  apiKey?: string;
  supportsReasoningEffort?: boolean;
  /** vLLM/Qwen3 `enable_thinking` switch; thinking otherwise eats the whole token budget. */
  thinkingToggle?: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Assistant turns only: a tool call the model made in that turn (replayed as native tool history). */
  toolCall?: { id: string; name: string; input: Record<string, unknown> };
}

/** Tool result replayed after a historical tool call; the app handled the call itself. */
export const TOOL_RESULT_TEXT = "Done: the app showed this to the student.";

/** Anthropic-shaped tool definition; converted for OpenAI-compatible providers. */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ReasoningEffort = "low" | "medium" | "high";

export type StreamEvent =
  | { type: "meta"; provider: ProviderName; model: string }
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; input: unknown };

export const MAX_TOKENS = 4096;
const COOLDOWN_MS = 5 * 60 * 1000;
const COMPLETE_TIMEOUT_MS = 90_000;
const STREAM_TIMEOUT_MS = 30_000;

export const DEFAULT_XAI_BASE_URL = "https://inference.tesla.com/xai/v1";
export const DEFAULT_QWEN_BASE_URL = "https://inference.tesla.com/v1";
export const DEFAULT_QWEN_MODEL = "Qwen/Qwen3.8-Flash-Next-FP8";

export class AiUnavailableError extends Error {
  constructor(public readonly failures: { provider: ProviderName; message: string }[]) {
    super(
      failures.length === 0
        ? "No AI provider is configured"
        : `All AI providers failed: ${failures.map((f) => `${f.provider}: ${f.message}`).join("; ")}`,
    );
    this.name = "AiUnavailableError";
  }
}

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

function isVertexEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.CLAUDE_CODE_USE_VERTEX === "1" || !!env.ANTHROPIC_VERTEX_BASE_URL;
}

function hasAnthropicCredentials(env: NodeJS.ProcessEnv): boolean {
  return isVertexEnabled(env) || !!env.ANTHROPIC_API_KEY;
}

function parseOrder(raw: string | undefined): ProviderName[] {
  if (!raw) return DEFAULT_PROVIDER_ORDER;
  const names = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => (DEFAULT_PROVIDER_ORDER as string[]).includes(s));
  return names.length > 0 ? [...new Set(names)] : DEFAULT_PROVIDER_ORDER;
}

/** Configured providers in fallback order; unconfigured ones are omitted. */
export function getProviderChain(env: NodeJS.ProcessEnv = process.env): ProviderConfig[] {
  const sharedToken = env.ANTHROPIC_AUTH_TOKEN;
  const all: Record<ProviderName, ProviderConfig | null> = {
    grok:
      env.GROK_DEFAULT_MODEL && (env.XAI_API_KEY || sharedToken)
        ? {
            name: "grok",
            kind: "openai",
            model: env.GROK_DEFAULT_MODEL,
            baseURL: env.XAI_BASE_URL || DEFAULT_XAI_BASE_URL,
            apiKey: env.XAI_API_KEY || sharedToken,
            supportsReasoningEffort: true,
          }
        : null,
    sonnet:
      (env.ANTHROPIC_MODEL || env.ANTHROPIC_DEFAULT_SONNET_MODEL) && hasAnthropicCredentials(env)
        ? {
            name: "sonnet",
            kind: "anthropic",
            model: (env.ANTHROPIC_MODEL || env.ANTHROPIC_DEFAULT_SONNET_MODEL)!,
          }
        : null,
    opus:
      env.ANTHROPIC_DEFAULT_OPUS_MODEL && hasAnthropicCredentials(env)
        ? { name: "opus", kind: "anthropic", model: env.ANTHROPIC_DEFAULT_OPUS_MODEL }
        : null,
    qwen:
      env.QWEN_API_KEY || sharedToken
        ? {
            name: "qwen",
            kind: "openai",
            model: env.QWEN_MODEL || DEFAULT_QWEN_MODEL,
            baseURL: env.QWEN_BASE_URL || DEFAULT_QWEN_BASE_URL,
            apiKey: env.QWEN_API_KEY || sharedToken,
            thinkingToggle: true,
          }
        : null,
  };
  return parseOrder(env.AI_PROVIDER_ORDER)
    .map((name) => all[name])
    .filter((p): p is ProviderConfig => p !== null);
}

/** Model id of the first configured provider (used as a provenance label). */
export function getPrimaryModel(): string {
  return getProviderChain()[0]?.model ?? "none";
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const globalForAi = globalThis as unknown as {
  anthropic: AnthropicClient | undefined;
  openaiClients: Map<string, OpenAI> | undefined;
};

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

function getAnthropicClient(): AnthropicClient {
  if (!globalForAi.anthropic) {
    if (isVertexEnabled(process.env)) {
      globalForAi.anthropic = createVertexClient();
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
      globalForAi.anthropic = new Anthropic({ apiKey });
    }
  }
  return globalForAi.anthropic;
}

function getOpenAIClient(p: ProviderConfig): OpenAI {
  globalForAi.openaiClients ??= new Map();
  const key = `${p.baseURL}|${p.apiKey}`;
  let client = globalForAi.openaiClients.get(key);
  if (!client) {
    client = new OpenAI({ baseURL: p.baseURL, apiKey: p.apiKey, maxRetries: 1 });
    globalForAi.openaiClients.set(key, client);
  }
  return client;
}

// ---------------------------------------------------------------------------
// Fallback bookkeeping
// ---------------------------------------------------------------------------

const cooldownUntil = new Map<ProviderName, number>();

export function resetProviderCooldowns(): void {
  cooldownUntil.clear();
}

function candidates(): ProviderConfig[] {
  const chain = getProviderChain();
  const now = Date.now();
  const healthy = chain.filter((p) => (cooldownUntil.get(p.name) ?? 0) <= now);
  // When everything is cooling down, try them all rather than fail without trying.
  return healthy.length > 0 ? healthy : chain;
}

function markFailed(p: ProviderConfig, err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  cooldownUntil.set(p.name, Date.now() + COOLDOWN_MS);
  console.warn(`[ai] ${p.name} (${p.model}) failed: ${message}`);
  return message;
}

async function withFallback<T>(
  fn: (p: ProviderConfig) => Promise<T>,
  providers: ProviderConfig[] = candidates(),
): Promise<T> {
  const failures: { provider: ProviderName; message: string }[] = [];
  for (const p of providers) {
    try {
      const result = await fn(p);
      cooldownUntil.delete(p.name);
      return result;
    } catch (err) {
      failures.push({ provider: p.name, message: markFailed(p, err) });
    }
  }
  throw new AiUnavailableError(failures);
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function toOpenAITool(tool: ToolDefinition): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  };
}

/** Provider-specific reasoning knobs for OpenAI-compatible requests. */
export function openAIReasoningParams(
  p: ProviderConfig,
  effort: ReasoningEffort | undefined,
): Record<string, unknown> {
  if (p.supportsReasoningEffort) return effort ? { reasoning_effort: effort } : {};
  if (p.thinkingToggle) {
    return { chat_template_kwargs: { enable_thinking: effort === "medium" || effort === "high" } };
  }
  return {};
}

export function toOpenAIMessages(
  system: string | undefined,
  messages: ChatMessage[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = system
    ? [{ role: "system", content: system }]
    : [];
  for (const m of messages) {
    if (m.role === "assistant" && m.toolCall) {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: [
          {
            id: m.toolCall.id,
            type: "function",
            function: { name: m.toolCall.name, arguments: JSON.stringify(m.toolCall.input) },
          },
        ],
      });
      out.push({ role: "tool", tool_call_id: m.toolCall.id, content: TOOL_RESULT_TEXT });
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

export function toAnthropicMessages(messages: ChatMessage[]): Anthropic.Messages.MessageParam[] {
  const out: Anthropic.Messages.MessageParam[] = [];
  let pendingToolId: string | null = null;
  for (const m of messages) {
    if (m.role === "assistant") {
      const blocks: Anthropic.Messages.ContentBlockParam[] = [];
      if (m.content.trim()) blocks.push({ type: "text", text: m.content });
      if (m.toolCall) {
        blocks.push({ type: "tool_use", id: m.toolCall.id, name: m.toolCall.name, input: m.toolCall.input });
        pendingToolId = m.toolCall.id;
      }
      out.push({ role: "assistant", content: blocks.length > 0 ? blocks : m.content });
    } else if (pendingToolId) {
      out.push({
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: pendingToolId, content: TOOL_RESULT_TEXT },
          { type: "text", text: m.content },
        ],
      });
      pendingToolId = null;
    } else {
      out.push({ role: "user", content: m.content });
    }
  }
  return out;
}

/** Drop `<think>…</think>` blocks some open models emit inline, then trim. */
export function cleanModelText(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Grok sometimes double-escapes non-ASCII in tool args ("Fu\\u00dfball"); undo that. */
export function decodeStrayUnicodeEscapes(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }
  if (Array.isArray(value)) return value.map(decodeStrayUnicodeEscapes);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeStrayUnicodeEscapes(v)]));
  }
  return value;
}

function parseJsonArgs(raw: string): unknown {
  try {
    return decodeStrayUnicodeEscapes(JSON.parse(raw));
  } catch {
    return null;
  }
}

function anthropicTool(tool: ToolDefinition): Anthropic.Messages.Tool {
  return tool as unknown as Anthropic.Messages.Tool;
}

// Newer Claude models reject `temperature` and forced `tool_choice`. We learn
// that per model from the 400 response and retry without the option.
interface AnthropicQuirks {
  noTemperature?: boolean;
  noForcedTool?: boolean;
}
const anthropicQuirks = new Map<string, AnthropicQuirks>();

/** Clears cooldowns and learned model quirks (tests). */
export function resetAiState(): void {
  cooldownUntil.clear();
  anthropicQuirks.clear();
}

function learnAnthropicQuirk(model: string, err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const quirks = anthropicQuirks.get(model) ?? {};
  if (!quirks.noTemperature && /temperature/i.test(message) && /deprecated|not supported/i.test(message)) {
    anthropicQuirks.set(model, { ...quirks, noTemperature: true });
    return true;
  }
  if (!quirks.noForcedTool && /tool_choice/i.test(message) && /not supported/i.test(message)) {
    anthropicQuirks.set(model, { ...quirks, noForcedTool: true });
    return true;
  }
  return false;
}

function applyAnthropicQuirks<T extends Anthropic.Messages.MessageCreateParams>(model: string, params: T): T {
  const quirks = anthropicQuirks.get(model);
  if (!quirks) return params;
  const next = { ...params };
  if (quirks.noTemperature) delete next.temperature;
  if (quirks.noForcedTool && next.tool_choice && next.tool_choice.type === "tool") {
    const name = next.tool_choice.name;
    next.tool_choice = { type: "auto" };
    next.system = `${typeof next.system === "string" ? next.system + "\n\n" : ""}You must answer by calling the "${name}" tool.`;
  }
  return next;
}

async function anthropicCreate(
  p: ProviderConfig,
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  timeout: number,
): Promise<Anthropic.Messages.Message> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getAnthropicClient().messages.create(applyAnthropicQuirks(p.model, params), {
        timeout,
        maxRetries: 1,
      });
    } catch (err) {
      if (attempt >= 2 || !learnAnthropicQuirk(p.model, err)) throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// completeText
// ---------------------------------------------------------------------------

export interface CompleteTextOptions {
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: ReasoningEffort;
  timeoutMs?: number;
  /** Restrict to these providers (still in chain order). */
  only?: ProviderName[];
  /** Try these providers first (in this order), then the rest of the chain. */
  prefer?: ProviderName[];
}

function selectProviders(opts: Pick<CompleteTextOptions, "only" | "prefer">): ProviderConfig[] | undefined {
  if (opts.only) return getProviderChain().filter((p) => opts.only!.includes(p.name));
  const prefer = opts.prefer;
  if (!prefer?.length) return undefined;
  const rank = (p: ProviderConfig) => {
    const i = prefer.indexOf(p.name);
    return i === -1 ? prefer.length : i;
  };
  return [...candidates()].sort((a, b) => rank(a) - rank(b));
}

export async function completeText(
  opts: CompleteTextOptions,
): Promise<{ text: string; provider: ProviderName; model: string }> {
  const maxTokens = opts.maxTokens ?? MAX_TOKENS;
  const timeout = opts.timeoutMs ?? COMPLETE_TIMEOUT_MS;

  return withFallback(async (p) => {
    let text: string;
    if (p.kind === "anthropic") {
      const res = await anthropicCreate(
        p,
        {
          model: p.model,
          max_tokens: maxTokens,
          ...(opts.system ? { system: opts.system } : {}),
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
          messages: toAnthropicMessages(opts.messages),
        },
        timeout,
      );
      text = res.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    } else {
      const res = await getOpenAIClient(p).chat.completions.create(
        {
          model: p.model,
          max_tokens: maxTokens,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
          ...openAIReasoningParams(p, opts.reasoningEffort),
          messages: toOpenAIMessages(opts.system, opts.messages),
        },
        { timeout },
      );
      text = res.choices[0]?.message?.content ?? "";
    }
    text = cleanModelText(text);
    if (!text) throw new Error("Empty response");
    return { text, provider: p.name, model: p.model };
  }, selectProviders(opts));
}

// ---------------------------------------------------------------------------
// callTool — forced single tool call with optional validation
// ---------------------------------------------------------------------------

export interface CallToolOptions<T> extends Omit<CompleteTextOptions, "temperature"> {
  tool: ToolDefinition;
  temperature?: number;
  /** Validate/transform the tool input; throwing moves on to the next provider. */
  parse?: (input: unknown) => T;
}

export async function callTool<T = unknown>(
  opts: CallToolOptions<T>,
): Promise<{ input: T; provider: ProviderName; model: string }> {
  const maxTokens = opts.maxTokens ?? 1024;
  const timeout = opts.timeoutMs ?? COMPLETE_TIMEOUT_MS;
  const parse = opts.parse ?? ((x: unknown) => x as T);

  return withFallback(async (p) => {
    let raw: unknown;
    if (p.kind === "anthropic") {
      const res = await anthropicCreate(
        p,
        {
          model: p.model,
          max_tokens: maxTokens,
          ...(opts.system ? { system: opts.system } : {}),
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
          tools: [anthropicTool(opts.tool)],
          tool_choice: { type: "tool", name: opts.tool.name },
          messages: toAnthropicMessages(opts.messages),
        },
        timeout,
      );
      const block = res.content.find(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
      );
      if (!block) throw new Error("No tool call in response");
      raw = block.input;
    } else {
      const res = await getOpenAIClient(p).chat.completions.create(
        {
          model: p.model,
          max_tokens: maxTokens,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
          ...openAIReasoningParams(p, opts.reasoningEffort),
          tools: [toOpenAITool(opts.tool)],
          tool_choice: { type: "function", function: { name: opts.tool.name } },
          messages: toOpenAIMessages(opts.system, opts.messages),
        },
        { timeout },
      );
      const call = res.choices[0]?.message?.tool_calls?.find((c) => c.type === "function");
      if (!call || call.type !== "function") throw new Error("No tool call in response");
      raw = parseJsonArgs(call.function.arguments);
      if (raw === null) throw new Error("Tool arguments were not valid JSON");
    }
    return { input: parse(raw), provider: p.name, model: p.model };
  }, selectProviders(opts));
}

// ---------------------------------------------------------------------------
// streamChat — falls back only until the first event has been emitted
// ---------------------------------------------------------------------------

export interface StreamChatOptions {
  system?: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: ReasoningEffort;
  timeoutMs?: number;
}

type ProviderEvent = Exclude<StreamEvent, { type: "meta" }>;

async function* streamAnthropic(
  p: ProviderConfig,
  opts: StreamChatOptions,
): AsyncGenerator<ProviderEvent> {
  const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: p.model,
    max_tokens: opts.maxTokens ?? 2048,
    ...(opts.system ? { system: opts.system } : {}),
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.tools?.length ? { tools: opts.tools.map(anthropicTool) } : {}),
    messages: toAnthropicMessages(opts.messages),
  };
  for (let attempt = 0; ; attempt++) {
    let yielded = false;
    try {
      const stream = getAnthropicClient().messages.stream(applyAnthropicQuirks(p.model, params), {
        timeout: opts.timeoutMs ?? STREAM_TIMEOUT_MS,
        maxRetries: 1,
      });
      const toolBlocks = new Map<number, { name: string; input: string }>();
      for await (const event of stream) {
        if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          toolBlocks.set(event.index, { name: event.content_block.name, input: "" });
        } else if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta" && event.delta.text) {
            yielded = true;
            yield { type: "text", text: event.delta.text };
          } else if (event.delta.type === "input_json_delta") {
            const block = toolBlocks.get(event.index);
            if (block) block.input += event.delta.partial_json;
          }
        } else if (event.type === "content_block_stop") {
          const block = toolBlocks.get(event.index);
          if (block) {
            toolBlocks.delete(event.index);
            yielded = true;
            yield { type: "tool_call", name: block.name, input: parseJsonArgs(block.input || "{}") };
          }
        }
      }
      return;
    } catch (err) {
      if (yielded || attempt >= 2 || !learnAnthropicQuirk(p.model, err)) throw err;
    }
  }
}

/**
 * Streaming filter for OpenAI-compatible text: trims leading whitespace and
 * hides inline `<think>…</think>` blocks.
 */
export function createThinkFilter() {
  let buffer = "";
  let inThink = false;
  let started = false;
  return {
    push(chunk: string): string {
      buffer += chunk;
      let out = "";
      while (buffer) {
        if (inThink) {
          const end = buffer.indexOf("</think>");
          if (end === -1) {
            buffer = buffer.slice(Math.max(0, buffer.length - 7));
            return finalize(out);
          }
          buffer = buffer.slice(end + "</think>".length);
          inThink = false;
          continue;
        }
        const start = buffer.indexOf("<think>");
        if (start === -1) {
          // Hold back a possible partial "<think>" prefix at the end.
          const lt = buffer.lastIndexOf("<");
          if (lt !== -1 && "<think>".startsWith(buffer.slice(lt))) {
            out += buffer.slice(0, lt);
            buffer = buffer.slice(lt);
          } else {
            out += buffer;
            buffer = "";
          }
          return finalize(out);
        }
        out += buffer.slice(0, start);
        buffer = buffer.slice(start + "<think>".length);
        inThink = true;
      }
      return finalize(out);
    },
    flush(): string {
      const rest = inThink ? "" : buffer;
      buffer = "";
      return finalize(rest);
    },
  };
  function finalize(text: string): string {
    if (started) return text;
    const trimmed = text.replace(/^\s+/, "");
    if (trimmed) started = true;
    return trimmed;
  }
}

async function* streamOpenAI(
  p: ProviderConfig,
  opts: StreamChatOptions,
): AsyncGenerator<ProviderEvent> {
  const stream = await getOpenAIClient(p).chat.completions.create(
    {
      model: p.model,
      stream: true,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.tools?.length ? { tools: opts.tools.map(toOpenAITool) } : {}),
      ...openAIReasoningParams(p, opts.reasoningEffort),
      messages: toOpenAIMessages(opts.system, opts.messages),
    },
    { timeout: opts.timeoutMs ?? STREAM_TIMEOUT_MS },
  );
  const filter = createThinkFilter();
  const calls = new Map<number, { name: string; args: string }>();
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;
    if (delta.content) {
      const text = filter.push(delta.content);
      if (text) yield { type: "text", text };
    }
    for (const tc of delta.tool_calls ?? []) {
      const cur = calls.get(tc.index) ?? { name: "", args: "" };
      if (tc.function?.name && !cur.name) cur.name = tc.function.name;
      if (tc.function?.arguments) cur.args += tc.function.arguments;
      calls.set(tc.index, cur);
    }
  }
  const rest = filter.flush();
  if (rest) yield { type: "text", text: rest };
  for (const call of calls.values()) {
    if (call.name) {
      yield { type: "tool_call", name: call.name, input: parseJsonArgs(call.args || "{}") };
    }
  }
}

export async function* streamChat(opts: StreamChatOptions): AsyncGenerator<StreamEvent> {
  const failures: { provider: ProviderName; message: string }[] = [];
  for (const p of candidates()) {
    let emitted = false;
    try {
      const source = p.kind === "anthropic" ? streamAnthropic(p, opts) : streamOpenAI(p, opts);
      for await (const event of source) {
        if (!emitted) {
          emitted = true;
          yield { type: "meta", provider: p.name, model: p.model };
        }
        yield event;
      }
      if (!emitted) throw new Error("Empty response");
      cooldownUntil.delete(p.name);
      return;
    } catch (err) {
      const message = markFailed(p, err);
      // Tokens already reached the client; switching models mid-reply would garble it.
      if (emitted) throw err;
      failures.push({ provider: p.name, message });
    }
  }
  throw new AiUnavailableError(failures);
}
