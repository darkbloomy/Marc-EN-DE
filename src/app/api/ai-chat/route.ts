import { z } from "zod/v4";
import { streamChat, AiUnavailableError, type ChatMessage } from "@/lib/ai";
import {
  buildTutorSystemPrompt,
  getRecentMistakesContext,
  planReadyText,
  PROPOSE_PLAN_TOOL,
  validatePracticePlan,
} from "@/lib/ai/tutor";
import { errorResponse, ErrorCode } from "@/lib/api-response";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;

const chatSchema = z.object({
  profileId: z.string().min(1),
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
          toolCall: z
            .object({
              name: z.literal(PROPOSE_PLAN_TOOL.name),
              input: z.record(z.string(), z.unknown()),
            })
            .optional(),
        })
        .refine((m) => m.content.trim().length > 0 || (m.role === "assistant" && m.toolCall), {
          message: "Each message needs content (or, for assistant turns, a tool call)",
        }),
    )
    .min(1)
    .max(MAX_MESSAGES),
  /** Serialized description of the last proposed plan, for follow-up edits. */
  lastPlan: z.string().max(500).optional(),
});

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
} as const;

type ChatEvent =
  | { type: "token"; text: string }
  | { type: "plan"; status: "ok"; plan: { language: string; topics: { topicId: string; count: number }[]; difficulty?: number } }
  | { type: "plan"; status: "rejected"; error: string }
  | { type: "done"; assistantText: string }
  | { type: "error"; message: string };

function badRequest(message: string) {
  return errorResponse(ErrorCode.INVALID_INPUT, message);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  }
  const data = parsed.data;
  const messages: ChatMessage[] = data.messages.map((m, i) => ({
    role: m.role,
    content: m.content.slice(0, MAX_MESSAGE_CHARS),
    ...(m.role === "assistant" && m.toolCall
      ? { toolCall: { id: `call_${i}`, name: m.toolCall.name, input: m.toolCall.input } }
      : {}),
  }));

  const { readable, writable } = new TransformStream<string, string>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  void (async () => {
    const send = (evt: ChatEvent) => {
      writer.write(`data: ${JSON.stringify(evt)}\n\n`).catch(() => {});
    };

    try {
      const recentMistakes = await getRecentMistakesContext(data.profileId);
      const system = buildTutorSystemPrompt({
        recentMistakes,
        lastPlan: data.lastPlan,
      });

      let assistantText = "";
      let planSent = false;

      const stream = streamChat({
        system,
        messages,
        tools: [PROPOSE_PLAN_TOOL],
        maxTokens: 2040,
        temperature: 0.7,
      });

      for await (const event of stream) {
        if (event.type === "meta") {
          console.info(`ai-chat: answering with ${event.provider} (${event.model})`);
        } else if (event.type === "text") {
          assistantText += event.text;
          send({ type: "token", text: event.text });
        } else if (event.name === PROPOSE_PLAN_TOOL.name) {
          planSent = true;
          const validation = validatePracticePlan(event.input);
          if (validation.ok) {
            send({ type: "plan", status: "ok", plan: validation.plan });
          } else {
            send({ type: "plan", status: "rejected", error: validation.error });
          }
        }
      }

      if (planSent && !assistantText.trim()) {
        assistantText = planReadyText(messages[messages.length - 1]?.content ?? "");
        send({ type: "token", text: assistantText });
      }

      send({ type: "done", assistantText: assistantText.trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed";
      console.error("ai-chat stream error:", message);
      const friendly =
        error instanceof AiUnavailableError
          ? "The AI tutor can't reach any AI model right now. Are you on the internal network? Please try again later."
          : message;
      send({ type: "error", message: friendly });
    } finally {
      writer.close().catch(() => {});
    }
  })();

  const encoded = readable.pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform: (chunk, controller) => {
        controller.enqueue(encoder.encode(chunk));
      },
    }),
  );

  return new Response(encoded, { headers: SSE_HEADERS });
}
