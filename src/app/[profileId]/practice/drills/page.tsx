"use client";

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise } from "@/lib/exercises/types";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { SessionSummary } from "@/components/SessionSummary";
import { Loader2, PencilRuler } from "lucide-react";

type Stage = "pick" | "loading" | "practicing" | "summary";

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

const COUNT_OPTIONS = [10, 15, 20];

export default function DrillsPage() {
  const profile = useProfile();
  const [stage, setStage] = useState<Stage>("pick");
  const [nounCount, setNounCount] = useState(10);
  const [verbCount, setVerbCount] = useState(10);
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [results, setResults] = useState<ExerciseResultSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = nounCount + verbCount;

  async function startDrills() {
    if (total === 0) return;
    setStage("loading");
    setError(null);

    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language: "de",
          mode: "drills",
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok)
        throw new Error(sessionData.error ?? "Failed to create session");
      setSessionId(sessionData.data.id);

      const buildRes = await fetch("/api/sessions/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language: "de",
          mode: "drills",
          nounCount,
          verbCount,
        }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok)
        throw new Error(buildData.error ?? "Failed to build session");

      if (!buildData.data.exercises?.length) {
        throw new Error("No drill exercises available yet — seed the pool first.");
      }

      setExercises(buildData.data.exercises);
      setStage("practicing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("pick");
    }
  }

  async function handleComplete(exerciseResults: ExerciseResultSummary[]) {
    setResults(exerciseResults);

    if (sessionId) {
      const totalPoints = exerciseResults.reduce(
        (sum, r) => sum + r.pointsEarned,
        0
      );

      for (let i = 0; i < exerciseResults.length; i++) {
        const ex = exercises[i];
        const result = exerciseResults[i];
        await fetch(`/api/sessions/${sessionId}/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: ex.language,
            category: ex.category,
            topic: ex.topic,
            exerciseType: ex.exercise.type,
            question:
              "question" in ex.exercise
                ? ex.exercise.question
                : "sentence" in ex.exercise
                  ? ex.exercise.sentence
                  : ex.exercise.type,
            userAnswer: result.userAnswer,
            correctAnswer: getCorrectAnswer(ex),
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            timeSpentSec: 0,
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

    setStage("summary");
  }

  function handlePracticeAgain() {
    setStage("pick");
    setExercises([]);
    setResults([]);
    setSessionId(null);
    setError(null);
  }

  if (stage === "pick") {
    return (
      <div className="max-w-lg mx-auto space-y-8 py-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-2">
            <PencilRuler size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Grammar Drills 🇩🇪</h1>
          <p className="text-gray-500">
            Choose how many of each to practice
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <CountPicker
          label="Nouns (Artikel + Plural)"
          emoji="📦"
          value={nounCount}
          onChange={setNounCount}
        />
        <CountPicker
          label="Verbs (Konjugation)"
          emoji="🏃"
          value={verbCount}
          onChange={setVerbCount}
        />

        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-sm text-gray-500">Total exercises</div>
          <div className="text-3xl font-bold text-gray-800">{total}</div>
        </div>

        <button
          onClick={startDrills}
          disabled={total === 0}
          className="w-full py-4 px-4 bg-emerald-600 text-white font-semibold rounded-2xl text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Start Drills
        </button>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={48} className="text-emerald-500 animate-spin" />
        <p className="text-gray-500 text-lg">Preparing your drills...</p>
      </div>
    );
  }

  if (stage === "practicing") {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <ExerciseRenderer exercises={exercises} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="py-8">
      <SessionSummary results={results} onPracticeAgain={handlePracticeAgain} />
    </div>
  );
}

function CountPicker({
  label,
  emoji,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <span className="text-xl">{emoji}</span>
        {label}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {COUNT_OPTIONS.map((n) => {
          const isActive = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={`py-3 rounded-xl text-lg font-semibold border-2 transition-colors ${
                isActive
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
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
