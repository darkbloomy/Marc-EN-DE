"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  PlayCircle,
  AlertTriangle,
  RotateCcw,
  Mic,
  Square,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise } from "@/lib/exercises/types";
import { toModelHistory } from "@/lib/ai/chat-history";
import { describePlan, type PracticePlan } from "@/lib/ai/plan";
import {
  DEFAULT_SPEECH_LANG,
  SPEECH_LANGS,
  isSpeechLang,
  type SpeechLang,
} from "@/lib/speech";
import { useSpeechInput } from "@/components/useSpeechInput";

export type AiPlan = PracticePlan;

type ChatMsg =
  | { kind: "user"; text: string }
  | {
      kind: "assistant";
      text: string;
      toolCall?: { name: string; input: Record<string, unknown> };
      local?: boolean;
    }
  | { kind: "plan"; status: "ok"; plan: AiPlan }
  | { kind: "plan"; status: "rejected"; error: string }
  | { kind: "error"; text: string };

type StreamEvent =
  | { type: "token"; text: string }
  | { type: "plan"; status: "ok"; plan: AiPlan }
  | { type: "plan"; status: "rejected"; error: string }
  | { type: "done"; assistantText: string }
  | { type: "error"; message: string };

const SUGGESTIONS = [
  "Generate 20 exercises for English simple past",
  "Make 10 German relative clause drills",
  "Explain the difference between Perfekt and Präteritum",
  "What am I bad at recently?",
];

const SESSION_KEY_PREFIX = "ai-session-";
const SPEECH_LANG_KEY = "ai-tutor-speech-lang";

function loadSpeechLang(): SpeechLang {
  try {
    const stored = typeof window === "undefined" ? null : localStorage.getItem(SPEECH_LANG_KEY);
    return isSpeechLang(stored) ? stored : DEFAULT_SPEECH_LANG;
  } catch {
    return DEFAULT_SPEECH_LANG;
  }
}

export function AiChatModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfile();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streamText, setStreamText] = useState("");
  const [busy, setBusy] = useState(false);
  const [startingPlan, setStartingPlan] = useState(false);
  const [lastPlan, setLastPlan] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<SpeechLang>(loadSpeechLang);
  const speech = useSpeechInput(setInput);
  const { cancel: cancelSpeech } = speech;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) cancelSpeech();
  }, [open, cancelSpeech]);

  function chooseSpeechLang(lang: SpeechLang) {
    setSpeechLang(lang);
    try {
      localStorage.setItem(SPEECH_LANG_KEY, lang);
    } catch {
      // storage unavailable (private mode) — the choice lasts until reload
    }
    if (speech.listening) speech.start(input, lang);
  }

  function toggleMic() {
    if (speech.listening) speech.stop();
    else speech.start(input, speechLang);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamText]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    speech.cancel();
    setInput("");
    setBusy(true);
    setMessages((prev) => [...prev, { kind: "user", text: trimmed }]);

    const history = toModelHistory(messages, trimmed);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          messages: history,
          ...(lastPlan ? { lastPlan } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "AI request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let doneText = "";
      let planShown: AiPlan | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (evt.type === "token") {
            setStreamText((prev) => prev + evt.text);
          } else if (evt.type === "plan" && evt.status === "ok") {
            setStreamText("");
            setMessages((prev) => [...prev, { kind: "plan", status: "ok", plan: evt.plan }]);
            planShown = evt.plan;
            setLastPlan(describePlan(evt.plan));
          } else if (evt.type === "plan" && evt.status === "rejected") {
            setStreamText("");
            setMessages((prev) => [
              ...prev,
              { kind: "plan", status: "rejected", error: evt.error },
            ]);
          } else if (evt.type === "done") {
            doneText = evt.assistantText;
          } else if (evt.type === "error") {
            throw new Error(evt.message);
          }
        }
      }

      // The model must see earlier plans as tool calls; if it only sees plan
      // text, it starts "proposing" plans in plain text without a card.
      const toolCall = planShown
        ? { name: "propose_practice_plan", input: { ...planShown } }
        : undefined;
      if (doneText || toolCall) {
        setMessages((prev) => [...prev, { kind: "assistant", text: doneText, toolCall }]);
      }
      setStreamText("");
    } catch (err) {
      setStreamText("");
      setMessages((prev) => [
        ...prev,
        {
          kind: "error",
          text: err instanceof Error ? err.message : "Something went wrong",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function startPlan(plan: AiPlan) {
    setStartingPlan(true);
    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language: plan.language,
          mode: "custom",
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error ?? "Failed to create session");
      const sessionId: string = sessionData.data.id;

      const buildRes = await fetch("/api/sessions/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language: plan.language,
          mode: "custom",
          plan: plan.topics,
          ...(plan.difficulty ? { difficulty: plan.difficulty } : {}),
          ...(plan.exerciseTypes ? { exerciseTypes: plan.exerciseTypes } : {}),
          ...(plan.multipleChoicePercent !== undefined
            ? { multipleChoicePercent: plan.multipleChoicePercent }
            : {}),
        }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) throw new Error(buildData.error ?? "Failed to build session");
      const exercises: GeneratedExercise[] = buildData.data.exercises;
      if (!exercises || exercises.length === 0) {
        throw new Error("No exercises were generated — try again");
      }

      try {
        sessionStorage.setItem(
          `${SESSION_KEY_PREFIX}${sessionId}`,
          JSON.stringify({ exercises, plan, language: plan.language }),
        );
      } catch {
        // sessionStorage unavailable (private mode) — practice still works this visit
      }

      setMessages((prev) => [
        ...prev,
        {
          kind: "assistant",
          text: `Starting your session now (${exercises.length} exercises). See you on the other side!`,
          local: true,
        },
      ]);
      onClose();
      router.push(`/${profile.id}/practice/custom/${sessionId}`);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          kind: "error",
          text: err instanceof Error ? err.message : "Failed to start the session",
        },
      ]);
    } finally {
      setStartingPlan(false);
    }
  }

  function clearChat() {
    speech.cancel();
    setMessages([]);
    setLastPlan(null);
    setStreamText("");
    setInput("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="AI tutor"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !startingPlan) onClose();
      }}
    >
      <div className="flex flex-col w-full sm:max-w-lg h-full sm:h-[80vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-violet-100 rounded-lg">
              <Sparkles size={18} className="text-violet-600" />
            </span>
            <h2 className="font-semibold text-gray-800">AI Tutor</h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                disabled={busy || startingPlan}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-40"
                title="Clear the conversation and start fresh"
              >
                <RotateCcw size={15} />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              disabled={busy || startingPlan}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !streamText && (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-gray-500 text-center">
                Ask me anything about German &amp; English — or tell me what you
                want to practice and I&rsquo;ll build a session for you.
              </p>
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-3 py-2 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            if (m.kind === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] bg-violet-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2 whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              );
            }
            if (m.kind === "assistant") {
              if (!m.text) return null;
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] bg-gray-100 text-gray-800 text-sm rounded-2xl rounded-bl-sm px-4 py-2 whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              );
            }
            if (m.kind === "error") {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] flex items-start gap-2 bg-red-50 text-red-600 text-sm rounded-2xl rounded-bl-sm px-4 py-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{m.text}</span>
                  </div>
                </div>
              );
            }
            if (m.status === "rejected") {
              return (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] flex items-start gap-2 bg-amber-50 text-amber-700 text-sm rounded-2xl rounded-bl-sm px-4 py-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>
                      That plan didn&rsquo;t work: {m.error}. Tell me what you
                      meant and I&rsquo;ll try again.
                    </span>
                  </div>
                </div>
              );
            }
            // plan card
            const total = m.plan.topics.reduce((s, t) => s + t.count, 0);
            return (
              <div key={i} className="flex justify-start">
                <div className="w-full max-w-[95%] bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <PlayCircle size={18} className="text-violet-600" />
                    <span className="font-semibold text-gray-800 text-sm">
                      Practice Plan
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{describePlan(m.plan)}</p>
                  <button
                    onClick={() => startPlan(m.plan)}
                    disabled={startingPlan || busy}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    {startingPlan ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Building your session…
                      </>
                    ) : (
                      <>
                        <PlayCircle size={18} />
                        Start ({total} exercises)
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Nothing starts until you tap it.
                  </p>
                </div>
              </div>
            );
          })}

          {streamText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-gray-100 text-gray-800 text-sm rounded-2xl rounded-bl-sm px-4 py-2 whitespace-pre-wrap">
                {streamText}
                <span className="inline-block w-2 h-4 bg-violet-400 ml-1 animate-pulse" />
              </div>
            </div>
          )}
          {busy && !streamText && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <Loader2 size={16} className="text-gray-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {speech.supported && (
          <div className="border-t border-gray-100 px-3 pt-2 flex items-center gap-2 bg-white">
            <span className="text-xs text-gray-400">Speak in</span>
            <div role="radiogroup" aria-label="Voice input language" className="flex gap-1">
              {SPEECH_LANGS.map((l) => (
                <button
                  key={l.code}
                  role="radio"
                  aria-checked={speechLang === l.code}
                  onClick={() => chooseSpeechLang(l.code)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    speechLang === l.code
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span
              className={`ml-auto text-xs truncate ${speech.error ? "text-red-500" : "text-violet-600"}`}
              aria-live="polite"
            >
              {speech.error ?? (speech.listening ? "Listening…" : "")}
            </span>
          </div>
        )}
        <div
          className={`p-3 flex items-end gap-2 bg-white ${
            speech.supported ? "" : "border-t border-gray-100"
          }`}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask or request practice…"
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          {speech.supported && (
            <button
              onClick={toggleMic}
              disabled={busy}
              className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
                speech.listening
                  ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                  : "border border-violet-200 text-violet-600 hover:bg-violet-50"
              }`}
              aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={speech.listening}
              title={speech.listening ? "Stop listening" : "Tap and speak"}
            >
              {speech.listening ? <Square size={18} /> : <Mic size={18} />}
            </button>
          )}
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
