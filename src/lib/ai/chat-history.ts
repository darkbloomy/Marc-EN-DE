export interface HistoryEntry {
  kind: "user" | "assistant" | "plan" | "error";
  text?: string;
  /** Assistant turns that proposed a plan: replayed to the model as a real tool call. */
  toolCall?: { name: string; input: Record<string, unknown> };
  /** UI-only message (e.g. "Starting your session…"); never sent to the model. */
  local?: boolean;
}

export interface ModelTurn {
  role: "user" | "assistant";
  content: string;
  toolCall?: { name: string; input: Record<string, unknown> };
}

export const MAX_HISTORY = 20;

/**
 * Chat turns to send to the model: user/assistant turns only, minus UI-only
 * messages, with consecutive same-role turns merged, ending with `next`.
 *
 * Plan turns carry the tool call but not the canned "here is your plan" text:
 * weaker models copy such text instead of calling the tool again.
 */
export function toModelHistory(entries: HistoryEntry[], next: string): ModelTurn[] {
  const out: ModelTurn[] = [];
  const push = (turn: ModelTurn) => {
    if (!turn.content.trim() && !turn.toolCall) return;
    const last = out[out.length - 1];
    if (last && last.role === turn.role && !last.toolCall && !turn.toolCall) {
      last.content = `${last.content}\n\n${turn.content}`;
    } else {
      out.push({ ...turn });
    }
  };
  for (const e of entries) {
    if (e.local) continue;
    if (e.kind === "user") push({ role: "user", content: e.text ?? "" });
    else if (e.kind === "assistant") {
      push(
        e.toolCall
          ? { role: "assistant", content: "", toolCall: e.toolCall }
          : { role: "assistant", content: e.text ?? "" },
      );
    }
  }
  push({ role: "user", content: next });
  const trimmed = out.slice(-MAX_HISTORY);
  // The API expects the conversation to start with a user turn.
  while (trimmed.length > 0 && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}
