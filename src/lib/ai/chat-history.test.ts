import { describe, it, expect } from "vitest";
import { MAX_HISTORY, toModelHistory, type HistoryEntry } from "./chat-history";

const plan = { language: "de", topics: [{ topicId: "de_drill_nouns", count: 10 }] };

describe("toModelHistory", () => {
  it("replays plan turns as tool calls without the canned text, and drops UI-only messages", () => {
    const entries: HistoryEntry[] = [
      { kind: "user", text: "10 noun drills" },
      { kind: "plan" },
      {
        kind: "assistant",
        text: "Here is your plan — tap Start on the card to begin!",
        toolCall: { name: "propose_practice_plan", input: plan },
      },
      { kind: "assistant", text: "Starting your session now (10 exercises).", local: true },
      { kind: "error", text: "boom" },
    ];
    expect(toModelHistory(entries, "again please")).toEqual([
      { role: "user", content: "10 noun drills" },
      { role: "assistant", content: "", toolCall: { name: "propose_practice_plan", input: plan } },
      { role: "user", content: "again please" },
    ]);
  });

  it("merges consecutive turns of the same role", () => {
    const entries: HistoryEntry[] = [
      { kind: "user", text: "hi" },
      { kind: "error", text: "network down" },
    ];
    expect(toModelHistory(entries, "hello?")).toEqual([{ role: "user", content: "hi\n\nhello?" }]);
  });

  it("keeps at most MAX_HISTORY turns and starts with a user turn", () => {
    const entries: HistoryEntry[] = [];
    for (let i = 0; i < 30; i++) {
      entries.push({ kind: "user", text: `q${i}` }, { kind: "assistant", text: `a${i}` });
    }
    const out = toModelHistory(entries, "last");
    expect(out.length).toBeLessThanOrEqual(MAX_HISTORY);
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1]).toEqual({ role: "user", content: "last" });
  });
});
