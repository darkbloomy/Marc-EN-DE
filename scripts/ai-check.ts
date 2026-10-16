import "dotenv/config";

import { callTool, completeText, getProviderChain, resetProviderCooldowns } from "../src/lib/ai";

const PING_TOOL = {
  name: "say",
  description: "Say a single word.",
  input_schema: {
    type: "object",
    properties: { word: { type: "string" } },
    required: ["word"],
  },
};

async function timed<T>(fn: () => Promise<T>): Promise<{ ok: true; ms: number; value: T } | { ok: false; ms: number; error: string }> {
  const start = Date.now();
  try {
    const value = await fn();
    return { ok: true, ms: Date.now() - start, value };
  } catch (err) {
    return { ok: false, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main(): Promise<void> {
  const chain = getProviderChain();
  if (chain.length === 0) {
    console.log("No AI providers configured. Check .env.");
    process.exit(1);
  }
  console.log(`Fallback order: ${chain.map((p) => `${p.name} (${p.model})`).join(" > ")}\n`);

  let anyOk = false;
  for (const p of chain) {
    resetProviderCooldowns();
    const text = await timed(() =>
      completeText({
        messages: [{ role: "user", content: "Reply with just: OK" }],
        maxTokens: 200,
        temperature: 0.7,
        timeoutMs: 45_000,
        only: [p.name],
      }),
    );
    resetProviderCooldowns();
    const tool = await timed(() =>
      callTool({
        tool: PING_TOOL,
        messages: [{ role: "user", content: "Call say with the German word for dog." }],
        maxTokens: 400,
        reasoningEffort: "low",
        timeoutMs: 45_000,
        only: [p.name],
      }),
    );
    anyOk ||= text.ok && tool.ok;
    const fmt = (r: typeof text | typeof tool, detail: string) =>
      r.ok ? `OK   ${String(r.ms).padStart(5)}ms  ${detail}` : `FAIL ${String(r.ms).padStart(5)}ms  ${r.error.slice(0, 160)}`;
    console.log(`${p.name.padEnd(6)} ${p.model}`);
    console.log(`  text: ${fmt(text, text.ok ? JSON.stringify(text.value.text.slice(0, 40)) : "")}`);
    console.log(`  tool: ${fmt(tool, tool.ok ? JSON.stringify(tool.value.input) : "")}`);
  }
  process.exit(anyOk ? 0 : 1);
}

main();
