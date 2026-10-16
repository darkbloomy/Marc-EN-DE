import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({
  openaiCreate: vi.fn(),
  anthropicCreate: vi.fn(),
  anthropicStream: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class {
    baseURL: string;
    chat: { completions: { create: (...args: unknown[]) => unknown } };
    constructor(opts: { baseURL: string }) {
      this.baseURL = opts.baseURL;
      this.chat = {
        completions: { create: (...args: unknown[]) => m.openaiCreate(this.baseURL, ...args) },
      };
    }
  },
}));

vi.mock("@anthropic-ai/vertex-sdk", () => ({
  AnthropicVertex: class {
    messages = {
      create: (...args: unknown[]) => m.anthropicCreate(...args),
      stream: (...args: unknown[]) => m.anthropicStream(...args),
    };
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({ default: class {} }));

import {
  AiUnavailableError,
  callTool,
  cleanModelText,
  completeText,
  createThinkFilter,
  getProviderChain,
  resetAiState,
  resetProviderCooldowns,
  streamChat,
  toOpenAITool,
  toOpenAIMessages,
  toAnthropicMessages,
  TOOL_RESULT_TEXT,
  DEFAULT_QWEN_MODEL,
  DEFAULT_XAI_BASE_URL,
  DEFAULT_QWEN_BASE_URL,
  type StreamEvent,
} from "./ai";

const FULL_ENV = {
  CLAUDE_CODE_USE_VERTEX: "1",
  ANTHROPIC_AUTH_TOKEN: "tok",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "claude-sonnet-x",
  ANTHROPIC_DEFAULT_OPUS_MODEL: "claude-opus-x",
  GROK_DEFAULT_MODEL: "grok-x",
};

function stubEnv(env: Record<string, string>) {
  for (const key of [
    "CLAUDE_CODE_USE_VERTEX",
    "ANTHROPIC_VERTEX_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "GROK_DEFAULT_MODEL",
    "XAI_API_KEY",
    "QWEN_API_KEY",
    "QWEN_MODEL",
    "AI_PROVIDER_ORDER",
  ]) {
    vi.stubEnv(key, env[key] ?? "");
  }
}

function openaiText(text: string) {
  return { choices: [{ message: { content: text } }] };
}

async function* chunks(...deltas: object[]) {
  for (const delta of deltas) yield { choices: [{ delta }] };
}

async function collect(gen: AsyncGenerator<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

beforeEach(() => {
  m.openaiCreate.mockReset();
  m.anthropicCreate.mockReset();
  m.anthropicStream.mockReset();
  resetAiState();
  stubEnv(FULL_ENV);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getProviderChain", () => {
  it("orders grok, sonnet, opus, qwen with defaults", () => {
    const chain = getProviderChain();
    expect(chain.map((p) => [p.name, p.model])).toEqual([
      ["grok", "grok-x"],
      ["sonnet", "claude-sonnet-x"],
      ["opus", "claude-opus-x"],
      ["qwen", DEFAULT_QWEN_MODEL],
    ]);
    expect(chain[0].baseURL).toBe(DEFAULT_XAI_BASE_URL);
    expect(chain[3].baseURL).toBe(DEFAULT_QWEN_BASE_URL);
    expect(chain[0].apiKey).toBe("tok");
  });

  it("skips providers that are not configured", () => {
    stubEnv({ ...FULL_ENV, GROK_DEFAULT_MODEL: "", ANTHROPIC_DEFAULT_OPUS_MODEL: "" });
    expect(getProviderChain().map((p) => p.name)).toEqual(["sonnet", "qwen"]);
  });

  it("drops Claude without Vertex or an API key", () => {
    stubEnv({ ...FULL_ENV, CLAUDE_CODE_USE_VERTEX: "" });
    expect(getProviderChain().map((p) => p.name)).toEqual(["grok", "qwen"]);
  });

  it("respects AI_PROVIDER_ORDER", () => {
    stubEnv({ ...FULL_ENV, AI_PROVIDER_ORDER: "qwen, sonnet, bogus" });
    expect(getProviderChain().map((p) => p.name)).toEqual(["qwen", "sonnet"]);
  });

  it("prefers ANTHROPIC_MODEL for the sonnet slot", () => {
    stubEnv({ ...FULL_ENV, ANTHROPIC_MODEL: "claude-pinned" });
    expect(getProviderChain().find((p) => p.name === "sonnet")?.model).toBe("claude-pinned");
  });
});

describe("completeText", () => {
  it("uses grok first when it works", async () => {
    m.openaiCreate.mockResolvedValueOnce(openaiText("hello"));
    const res = await completeText({ messages: [{ role: "user", content: "hi" }] });
    expect(res).toEqual({ text: "hello", provider: "grok", model: "grok-x" });
    expect(m.anthropicCreate).not.toHaveBeenCalled();
  });

  it("falls back to sonnet when grok fails, then puts grok on cooldown", async () => {
    m.openaiCreate.mockRejectedValueOnce(new Error("grok down"));
    m.anthropicCreate.mockResolvedValue({ content: [{ type: "text", text: "from claude" }] });

    const first = await completeText({ messages: [{ role: "user", content: "hi" }] });
    expect(first.provider).toBe("sonnet");
    expect(m.anthropicCreate.mock.calls[0][0].model).toBe("claude-sonnet-x");

    const second = await completeText({ messages: [{ role: "user", content: "hi" }] });
    expect(second.provider).toBe("sonnet");
    expect(m.openaiCreate).toHaveBeenCalledTimes(1);
  });

  it("walks the whole chain down to qwen", async () => {
    m.openaiCreate.mockImplementation(async (baseURL: string) => {
      if (baseURL === DEFAULT_XAI_BASE_URL) throw new Error("grok down");
      return openaiText("<think>hmm</think>\n\nqwen answer");
    });
    m.anthropicCreate.mockRejectedValue(new Error("404 model not found"));

    const res = await completeText({ messages: [{ role: "user", content: "hi" }] });
    expect(res).toEqual({ text: "qwen answer", provider: "qwen", model: DEFAULT_QWEN_MODEL });
    expect(m.anthropicCreate).toHaveBeenCalledTimes(2);
  });

  it("treats an empty reply as a failure", async () => {
    m.openaiCreate.mockResolvedValueOnce(openaiText("   "));
    m.anthropicCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "ok" }] });
    const res = await completeText({ messages: [{ role: "user", content: "hi" }] });
    expect(res.provider).toBe("sonnet");
  });

  it("throws AiUnavailableError when every provider fails", async () => {
    m.openaiCreate.mockRejectedValue(new Error("down"));
    m.anthropicCreate.mockRejectedValue(new Error("down"));
    await expect(completeText({ messages: [{ role: "user", content: "hi" }] })).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it("can be restricted to one provider", async () => {
    m.anthropicCreate.mockResolvedValueOnce({ content: [{ type: "text", text: "opus" }] });
    const res = await completeText({ messages: [{ role: "user", content: "hi" }], only: ["opus"] });
    expect(res.provider).toBe("opus");
    expect(m.openaiCreate).not.toHaveBeenCalled();
  });

  it("tries preferred providers first, then the rest of the chain", async () => {
    m.openaiCreate.mockImplementation(async (baseURL: string) => {
      if (baseURL === DEFAULT_QWEN_BASE_URL) throw new Error("qwen down");
      return openaiText("from grok");
    });
    const res = await completeText({ messages: [{ role: "user", content: "hi" }], prefer: ["qwen"] });
    expect(res.provider).toBe("grok");
    expect(m.openaiCreate.mock.calls.map((c) => c[0])).toEqual([DEFAULT_QWEN_BASE_URL, DEFAULT_XAI_BASE_URL]);
  });

  it("turns Qwen thinking off unless medium/high effort is requested", async () => {
    stubEnv({ ...FULL_ENV, AI_PROVIDER_ORDER: "qwen" });
    m.openaiCreate.mockResolvedValue(openaiText("ok"));
    await completeText({ messages: [{ role: "user", content: "hi" }] });
    await completeText({ messages: [{ role: "user", content: "hi" }], reasoningEffort: "low" });
    await completeText({ messages: [{ role: "user", content: "hi" }], reasoningEffort: "high" });
    expect(m.openaiCreate.mock.calls.map((c) => c[1].chat_template_kwargs)).toEqual([
      { enable_thinking: false },
      { enable_thinking: false },
      { enable_thinking: true },
    ]);
  });

  it("only sends reasoning_effort to grok", async () => {
    stubEnv({ ...FULL_ENV, AI_PROVIDER_ORDER: "qwen,grok" });
    m.openaiCreate.mockResolvedValue(openaiText("ok"));
    await completeText({ messages: [{ role: "user", content: "hi" }], reasoningEffort: "low" });
    expect(m.openaiCreate.mock.calls[0][1]).not.toHaveProperty("reasoning_effort");

    resetProviderCooldowns();
    stubEnv({ ...FULL_ENV, AI_PROVIDER_ORDER: "grok" });
    await completeText({ messages: [{ role: "user", content: "hi" }], reasoningEffort: "low" });
    expect(m.openaiCreate.mock.calls[1][1].reasoning_effort).toBe("low");
  });
});

describe("callTool", () => {
  const tool = {
    name: "say",
    description: "say a word",
    input_schema: { type: "object", properties: { w: { type: "string" } }, required: ["w"] },
  };

  it("parses OpenAI tool arguments", async () => {
    m.openaiCreate.mockResolvedValueOnce({
      choices: [
        { message: { tool_calls: [{ type: "function", function: { name: "say", arguments: '{"w":"Hund"}' } }] } },
      ],
    });
    const res = await callTool({ tool, messages: [{ role: "user", content: "dog" }] });
    expect(res.input).toEqual({ w: "Hund" });
    expect(m.openaiCreate.mock.calls[0][1].tool_choice).toEqual({
      type: "function",
      function: { name: "say" },
    });
  });

  it("decodes double-escaped unicode in tool arguments", async () => {
    m.openaiCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            tool_calls: [
              { type: "function", function: { name: "say", arguments: '{"w":"die Fu\\\\u00dfb\\\\u00e4lle","list":["\\\\u00fcber"]}' } },
            ],
          },
        },
      ],
    });
    const res = await callTool({ tool, messages: [{ role: "user", content: "x" }] });
    expect(res.input).toEqual({ w: "die Fußbälle", list: ["über"] });
  });

  it("falls back when parse rejects the input", async () => {
    m.openaiCreate.mockResolvedValueOnce({
      choices: [{ message: { tool_calls: [{ type: "function", function: { name: "say", arguments: "{}" } }] } }],
    });
    m.anthropicCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", name: "say", input: { w: "Hund" } }],
    });
    const res = await callTool({
      tool,
      messages: [{ role: "user", content: "dog" }],
      parse: (x) => {
        const w = (x as { w?: string }).w;
        if (!w) throw new Error("missing w");
        return w;
      },
    });
    expect(res).toMatchObject({ input: "Hund", provider: "sonnet" });
    expect(m.anthropicCreate.mock.calls[0][0].tool_choice).toEqual({ type: "tool", name: "say" });
  });

  it("retries Claude without temperature / forced tool_choice when the model rejects them", async () => {
    stubEnv({ ...FULL_ENV, AI_PROVIDER_ORDER: "sonnet" });
    m.anthropicCreate
      .mockRejectedValueOnce(new Error('400 "`temperature` is deprecated for this model."'))
      .mockRejectedValueOnce(new Error('400 tool_choice: type "tool" and "any" are not supported for this model.'))
      .mockResolvedValueOnce({ content: [{ type: "tool_use", name: "say", input: { w: "Hund" } }] })
      .mockResolvedValueOnce({ content: [{ type: "tool_use", name: "say", input: { w: "Katze" } }] });

    const opts = { tool, system: "Be kind.", temperature: 0.5, messages: [{ role: "user" as const, content: "dog" }] };
    const res = await callTool(opts);
    expect(res.input).toEqual({ w: "Hund" });
    const finalCall = m.anthropicCreate.mock.calls[2][0];
    expect(finalCall).not.toHaveProperty("temperature");
    expect(finalCall.tool_choice).toEqual({ type: "auto" });
    expect(finalCall.system).toContain('calling the "say" tool');

    // Learned quirks apply to the next request without another failed round-trip.
    await callTool(opts);
    expect(m.anthropicCreate).toHaveBeenCalledTimes(4);
    expect(m.anthropicCreate.mock.calls[3][0]).not.toHaveProperty("temperature");
  });

  it("converts tool definitions to OpenAI functions", () => {
    expect(toOpenAITool(tool)).toEqual({
      type: "function",
      function: { name: "say", description: "say a word", parameters: tool.input_schema },
    });
  });
});

describe("streamChat", () => {
  it("streams text and tool calls from an OpenAI-compatible provider", async () => {
    m.openaiCreate.mockResolvedValueOnce(
      chunks(
        { reasoning_content: "thinking" },
        { content: "\n\nHal" },
        { content: "lo" },
        { tool_calls: [{ index: 0, function: { name: "plan", arguments: '{"a":' } }] },
        { tool_calls: [{ index: 0, function: { arguments: "1}" } }] },
      ),
    );
    const events = await collect(streamChat({ messages: [{ role: "user", content: "hi" }] }));
    expect(events).toEqual([
      { type: "meta", provider: "grok", model: "grok-x" },
      { type: "text", text: "Hal" },
      { type: "text", text: "lo" },
      { type: "tool_call", name: "plan", input: { a: 1 } },
    ]);
  });

  it("falls back before the first event is emitted", async () => {
    m.openaiCreate.mockRejectedValueOnce(new Error("grok down"));
    m.anthropicStream.mockReturnValueOnce(
      (async function* () {
        yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hi" } };
      })(),
    );
    const events = await collect(streamChat({ messages: [{ role: "user", content: "hi" }] }));
    expect(events[0]).toEqual({ type: "meta", provider: "sonnet", model: "claude-sonnet-x" });
    expect(events[1]).toEqual({ type: "text", text: "Hi" });
  });

  it("does not switch providers after tokens were sent", async () => {
    m.openaiCreate.mockResolvedValueOnce(
      (async function* () {
        yield { choices: [{ delta: { content: "partial" } }] };
        throw new Error("connection reset");
      })(),
    );
    const gen = streamChat({ messages: [{ role: "user", content: "hi" }] });
    await expect(collect(gen)).rejects.toThrow("connection reset");
    expect(m.anthropicStream).not.toHaveBeenCalled();
  });
});

describe("tool-call history", () => {
  const history = [
    { role: "user" as const, content: "10 noun drills" },
    {
      role: "assistant" as const,
      content: "",
      toolCall: { id: "call_1", name: "propose_practice_plan", input: { language: "de" } },
    },
    { role: "user" as const, content: "again" },
  ];

  it("replays as assistant tool_calls + tool message for OpenAI-compatible providers", () => {
    expect(toOpenAIMessages("sys", history)).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "10 noun drills" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          { id: "call_1", type: "function", function: { name: "propose_practice_plan", arguments: '{"language":"de"}' } },
        ],
      },
      { role: "tool", tool_call_id: "call_1", content: TOOL_RESULT_TEXT },
      { role: "user", content: "again" },
    ]);
  });

  it("replays as tool_use + tool_result for Claude", () => {
    expect(toAnthropicMessages(history)).toEqual([
      { role: "user", content: "10 noun drills" },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "call_1", name: "propose_practice_plan", input: { language: "de" } }],
      },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "call_1", content: TOOL_RESULT_TEXT },
          { type: "text", text: "again" },
        ],
      },
    ]);
  });
});

describe("text cleanup", () => {
  it("cleanModelText strips think blocks and whitespace", () => {
    expect(cleanModelText("<think>x\ny</think>\n  OK ")).toBe("OK");
  });

  it("createThinkFilter hides think blocks split across chunks", () => {
    const f = createThinkFilter();
    const out = [f.push("<thi"), f.push("nk>secret</th"), f.push("ink>\n Hello"), f.push(" there"), f.flush()];
    expect(out.join("")).toBe("Hello there");
  });

  it("createThinkFilter passes plain text with < through", () => {
    const f = createThinkFilter();
    expect(f.push("a < b") + f.flush()).toBe("a < b");
  });
});
