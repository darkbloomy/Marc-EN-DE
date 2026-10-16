"use client";

import { useState, useCallback, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise, Language } from "@/lib/exercises/types";
import {
  getExerciseQuestionText,
  hashExerciseContent,
} from "@/lib/exercises/content-hash";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { ExerciseSheetActions } from "@/components/ExerciseSheetActions";
import { SessionSummary } from "@/components/SessionSummary";
import type { AiPlan } from "@/components/AiChatModal";
import { AlertTriangle, Sparkles } from "lucide-react";

interface StoredSession {
  exercises: GeneratedExercise[];
  plan: AiPlan;
  language: Language;
}

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

function loadStoredSession(sessionId: string): StoredSession | null {
  if (!sessionId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`ai-session-${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed && parsed.exercises && parsed.exercises.length > 0
      ? parsed
      : null;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};

export default function CustomPracticePage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";
  const profile = useProfile();

  // sessionStorage read via useSyncExternalStore (SSR-safe, no effect needed)
  const snapshotCache = useRef<{ key: string; value: StoredSession | null }>({
    key: "",
    value: null,
  });
  const getSnapshot = useCallback(() => {
    if (snapshotCache.current.key !== sessionId) {
      snapshotCache.current = {
        key: sessionId,
        value: loadStoredSession(sessionId),
      };
    }
    return snapshotCache.current.value;
  }, [sessionId]);
  const stored = useSyncExternalStore(noopSubscribe, getSnapshot, () => null);

  const [results, setResults] = useState<ExerciseResultSummary[] | null>(null);
  const [poolState, setPoolState] = useState<"idle" | "saving" | "saved">("idle");

  const handleComplete = useCallback(
    async (exerciseResults: ExerciseResultSummary[]) => {
      setResults(exerciseResults);
      if (stored) {
        const totalPoints = exerciseResults.reduce(
          (sum, r) => sum + r.pointsEarned,
          0,
        );
        for (let i = 0; i < exerciseResults.length; i++) {
          const ex = stored.exercises[i];
          const result = exerciseResults[i];
          await fetch(`/api/sessions/${sessionId}/results`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: ex.language,
              category: ex.category,
              topic: ex.topic,
              exerciseType: ex.exercise.type,
              question: getExerciseQuestionText(ex.exercise),
              userAnswer: result.userAnswer,
              correctAnswer: getCorrectAnswer(ex),
              isCorrect: result.isCorrect,
              pointsEarned: result.pointsEarned,
              timeSpentSec: 0,
              source: ex.source ?? "unknown",
              exerciseId: ex.poolId ?? null,
              contentHash: ex.contentHash ?? hashExerciseContent(ex.exercise),
              exercisePayload: JSON.stringify(ex.exercise),
            }),
          });
        }
        await fetch(`/api/sessions/${sessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalPoints,
            exerciseCount: exerciseResults.length,
          }),
        });
      }
    },
    [stored, sessionId],
  );

  const handleSaveToPool = useCallback(async () => {
    if (!stored || poolState !== "idle") return;
    setPoolState("saving");
    try {
      const res = await fetch("/api/pool/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: `ai-${sessionId}`,
          exercises: stored.exercises.map((ex) => ({
            payload: ex.exercise,
            language: ex.language,
            topic: ex.topic,
            category: ex.category,
            exerciseType: ex.exercise.type,
            difficulty: ex.difficulty,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok && json.error !== "No valid exercises to save") {
        throw new Error(json.error ?? "Failed to save to pool");
      }
      setPoolState("saved");
    } catch (err) {
      setPoolState("idle");
      alert(err instanceof Error ? err.message : "Failed to save to pool");
    }
  }, [stored, poolState, sessionId]);

  if (!stored) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <AlertTriangle size={48} className="text-amber-400 mx-auto" />
        <h1 className="text-xl font-bold text-gray-800">
          This session is no longer available
        </h1>
        <p className="text-gray-500 text-sm">
          The exercises were kept in your browser&rsquo;s memory and may have
          been cleared. Ask the AI tutor again and it will build a fresh one.
        </p>
        <Link
          href={`/${profile.id}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Sparkles size={16} />
          Back to Home
        </Link>
      </div>
    );
  }

  const sheetTitle =
    stored.language === "de" ? "AI Practice — German" : "AI Practice — English";

  if (!results) {
    return (
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <ExerciseSheetActions
          exercises={stored.exercises}
          language={stored.language}
          title={sheetTitle}
          mode="custom"
        />
        <ExerciseRenderer exercises={stored.exercises} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-4 max-w-2xl mx-auto">
      <ExerciseSheetActions
        exercises={stored.exercises}
        language={stored.language}
        title={sheetTitle}
        mode="custom"
      />
      <SessionSummary
        results={results}
        exercises={stored.exercises}
        sources={stored.exercises.map((e) => e.source)}
        onPracticeAgain={() => {
          window.location.href = `/${profile.id}`;
        }}
        onSaveToPool={handleSaveToPool}
        poolState={poolState}
      />
    </div>
  );
}

function getCorrectAnswer(ex: GeneratedExercise): string {
  switch (ex.exercise.type) {
    case "multiple_choice":
      return ex.exercise.options[ex.exercise.correctIndex];
    case "fill_in_the_blank":
      return ex.exercise.blanks
        ? ex.exercise.blanks.map((b) => b.correctAnswer).join(" | ")
        : ex.exercise.correctAnswer;
    case "true_false":
      return ex.exercise.isTrue ? "True" : "False";
    case "reorder":
      return ex.exercise.correctOrder.join(" ");
    case "free_text":
      return ex.exercise.sampleAnswer;
  }
}
