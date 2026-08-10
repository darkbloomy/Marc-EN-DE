"use client";

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise, Language } from "@/lib/exercises/types";
import {
  getExerciseQuestionText,
  hashExerciseContent,
} from "@/lib/exercises/content-hash";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { ExerciseSheetActions } from "@/components/ExerciseSheetActions";
import { SessionSummary } from "@/components/SessionSummary";
import { Loader2, PencilRuler } from "lucide-react";

type Stage = "pick" | "loading" | "practicing" | "summary";
type PickMode = "categories" | "mix";

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

const COUNT_OPTIONS = [0, 5, 10, 15, 20];
const MIX_OPTIONS = [10, 20, 30, 50];

type CategoryKey =
  | "nouns"
  | "verbs"
  | "adjectives"
  | "subclauses"
  | "prepositions";

interface CategoryDef {
  key: CategoryKey;
  label: string;
  emoji: string;
}

const DE_CATEGORIES: CategoryDef[] = [
  { key: "nouns", label: "Nouns (Artikel + Plural)", emoji: "📦" },
  { key: "verbs", label: "Verbs (Konjugation)", emoji: "🏃" },
  { key: "adjectives", label: "Adjectives (Komparativ / Superlativ)", emoji: "📏" },
  { key: "subclauses", label: "Subclauses (Nebensätze)", emoji: "🔗" },
  { key: "prepositions", label: "Prepositions (Präpositionen)", emoji: "📍" },
];

const EN_CATEGORIES: CategoryDef[] = [
  { key: "nouns", label: "Plurals", emoji: "📦" },
  { key: "verbs", label: "Verb forms", emoji: "🏃" },
  { key: "adjectives", label: "Adjectives (Comparative / Superlative)", emoji: "📏" },
  { key: "subclauses", label: "Subclauses", emoji: "🔗" },
  { key: "prepositions", label: "Prepositions", emoji: "📍" },
];

const EMPTY_COUNTS: Record<CategoryKey, number> = {
  nouns: 0,
  verbs: 0,
  adjectives: 0,
  subclauses: 0,
  prepositions: 0,
};

export default function DrillsPage() {
  const profile = useProfile();
  const [stage, setStage] = useState<Stage>("pick");
  const [language, setLanguage] = useState<Language>("de");
  const [pickMode, setPickMode] = useState<PickMode>("mix");
  const [mixTotal, setMixTotal] = useState(20);
  const [counts, setCounts] = useState({
    ...EMPTY_COUNTS,
    nouns: 5,
    verbs: 5,
  });
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [results, setResults] = useState<ExerciseResultSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = language === "de" ? DE_CATEGORIES : EN_CATEGORIES;
  const categoryTotal =
    counts.nouns +
    counts.verbs +
    counts.adjectives +
    counts.subclauses +
    counts.prepositions;
  const total = pickMode === "mix" ? mixTotal : categoryTotal;

  function setCount(key: CategoryKey, value: number) {
    setCounts((prev) => ({ ...prev, [key]: value }));
  }

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
          language,
          mode: "drills",
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok)
        throw new Error(sessionData.error ?? "Failed to create session");
      setSessionId(sessionData.data.id);

      const buildBody =
        pickMode === "mix"
          ? {
              profileId: profile.id,
              language,
              mode: "drills" as const,
              mixTotal,
            }
          : {
              profileId: profile.id,
              language,
              mode: "drills" as const,
              nounCount: counts.nouns,
              verbCount: counts.verbs,
              adjectiveCount: counts.adjectives,
              subclauseCount: counts.subclauses,
              prepositionCount: counts.prepositions,
            };

      const buildRes = await fetch("/api/sessions/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok)
        throw new Error(buildData.error ?? "Failed to build session");

      if (!buildData.data.exercises?.length) {
        throw new Error(
          "No drill exercises available yet — seed the pool first.",
        );
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
        0,
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
            question: getExerciseQuestionText(ex.exercise),
            userAnswer: result.userAnswer,
            correctAnswer: getCorrectAnswer(ex),
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            timeSpentSec: 0,
            source: ex.source ?? "unknown",
            exerciseId: ex.poolId ?? null,
            contentHash: ex.contentHash ?? hashExerciseContent(ex.exercise),
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
          <h1 className="text-2xl font-bold text-gray-800">Grammar Drills</h1>
          <p className="text-gray-500">
            Mix all aspects, or pick counts per category
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700">Language</div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "de" as const, label: "German 🇩🇪" },
                { id: "en" as const, label: "English 🇬🇧" },
              ] as const
            ).map((opt) => {
              const active = language === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setLanguage(opt.id)}
                  className={`py-3 rounded-xl text-lg font-semibold border-2 transition-colors ${
                    active
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700">Mode</div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "mix" as const, label: "Mixed (all aspects)" },
                { id: "categories" as const, label: "By category" },
              ] as const
            ).map((opt) => {
              const active = pickMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPickMode(opt.id)}
                  className={`py-3 px-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    active
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {pickMode === "mix" ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">
              Total exercises (random mix of all 5 aspects)
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MIX_OPTIONS.map((n) => {
                const isActive = mixTotal === n;
                return (
                  <button
                    key={n}
                    onClick={() => setMixTotal(n)}
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
        ) : (
          categories.map((cat) => (
            <CountPicker
              key={cat.key}
              label={cat.label}
              emoji={cat.emoji}
              value={counts[cat.key]}
              onChange={(n) => setCount(cat.key, n)}
            />
          ))
        )}

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

  const sheetTitle =
    language === "de" ? "Grammar Drills — German" : "Grammar Drills — English";

  if (stage === "practicing") {
    return (
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <ExerciseSheetActions
          exercises={exercises}
          language={language}
          title={sheetTitle}
          mode="drills"
        />
        <ExerciseRenderer exercises={exercises} onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-4 max-w-2xl mx-auto">
      <ExerciseSheetActions
        exercises={exercises}
        language={language}
        title={sheetTitle}
        mode="drills"
      />
      <SessionSummary
        results={results}
        sources={exercises.map((e) => e.source)}
        onPracticeAgain={handlePracticeAgain}
      />
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
      <div className="grid grid-cols-5 gap-2">
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
