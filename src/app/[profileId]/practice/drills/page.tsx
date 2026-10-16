"use client";

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise, Language } from "@/lib/exercises/types";
import {
  getExerciseCorrectAnswer,
  getExerciseQuestionText,
  hashExerciseContent,
} from "@/lib/exercises/content-hash";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { ExerciseSheetActions } from "@/components/ExerciseSheetActions";
import { SessionSummary } from "@/components/SessionSummary";
import { Loader2, PencilRuler } from "lucide-react";
import {
  emptyDrillCounts,
  sumDrillCounts,
  type DrillCategoryKey,
  type DrillCounts,
} from "@/lib/sessions/drill-categories";

type Stage = "pick" | "confirm" | "loading" | "practicing" | "summary";
type PickMode = "categories" | "mix";

const CHOICE_PRESETS = [0, 25, 50, 75, 100];

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

const COUNT_OPTIONS = [0, 5, 10, 15, 20];
const MIX_OPTIONS = [10, 20, 30, 50];

interface CategoryDef {
  key: DrillCategoryKey;
  label: string;
  emoji: string;
}

interface CategoryGroup {
  title: string;
  items: CategoryDef[];
}

const DE_GROUPS: CategoryGroup[] = [
  {
    title: "Core",
    items: [
      { key: "nouns", label: "Nouns (Artikel + Plural)", emoji: "📦" },
      { key: "verbs", label: "Verbs (Konjugation)", emoji: "🏃" },
      { key: "adjectives", label: "Adjectives (Komparativ / Superlativ)", emoji: "📏" },
      { key: "prepositions", label: "Prepositions (Präpositionen)", emoji: "📍" },
    ],
  },
  {
    title: "Clauses (Nebensätze)",
    items: [
      { key: "relative", label: "Relative clauses (Relativsätze)", emoji: "🔎" },
      { key: "adverbial", label: "Adverbial clauses (Adverbialsätze)", emoji: "🔗" },
      { key: "complement", label: "Complement clauses (dass / ob / W-Fragen)", emoji: "💬" },
      { key: "infinitive", label: "Infinitive clauses (um / ohne / statt … zu)", emoji: "➡️" },
    ],
  },
  {
    title: "More",
    items: [
      { key: "extras", label: "Extra (Zahlen, Zeit, Rede, Wendungen)", emoji: "🧩" },
    ],
  },
];

const EN_GROUPS: CategoryGroup[] = [
  {
    title: "Core",
    items: [
      { key: "nouns", label: "Plurals", emoji: "📦" },
      { key: "verbs", label: "Verb forms", emoji: "🏃" },
      { key: "adjectives", label: "Adjectives (Comparative / Superlative)", emoji: "📏" },
      { key: "prepositions", label: "Prepositions", emoji: "📍" },
    ],
  },
  {
    title: "Clauses",
    items: [
      { key: "relative", label: "Relative clauses", emoji: "🔎" },
      { key: "adverbial", label: "Adverbial clauses", emoji: "🔗" },
      { key: "complement", label: "Complement clauses (that / whether / wh-)", emoji: "💬" },
      { key: "infinitive", label: "Infinitive clauses (to / without / instead of)", emoji: "➡️" },
    ],
  },
  {
    title: "More",
    items: [
      { key: "extras", label: "Extra (numbers, time, speech, chunks)", emoji: "🧩" },
    ],
  },
];

export default function DrillsPage() {
  const profile = useProfile();
  const [stage, setStage] = useState<Stage>("pick");
  const [language, setLanguage] = useState<Language>("de");
  const [pickMode, setPickMode] = useState<PickMode>("mix");
  const [mixTotal, setMixTotal] = useState(20);
  const [counts, setCounts] = useState<DrillCounts>({
    ...emptyDrillCounts(),
    nouns: 5,
    verbs: 5,
  });
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [results, setResults] = useState<ExerciseResultSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choicePercent, setChoicePercent] = useState(50);

  const groups = language === "de" ? DE_GROUPS : EN_GROUPS;
  const categoryTotal = sumDrillCounts(counts);
  const total = pickMode === "mix" ? mixTotal : categoryTotal;

  function setCount(key: DrillCategoryKey, value: number) {
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
              choicePercent,
            }
          : {
              profileId: profile.id,
              language,
              mode: "drills" as const,
              nounCount: counts.nouns,
              verbCount: counts.verbs,
              adjectiveCount: counts.adjectives,
              prepositionCount: counts.prepositions,
              relativeCount: counts.relative,
              adverbialCount: counts.adverbial,
              complementCount: counts.complement,
              infinitiveCount: counts.infinitive,
              extraCount: counts.extras,
              choicePercent,
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
      setStage("confirm");
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
            correctAnswer: getExerciseCorrectAnswer(ex.exercise),
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
              Total exercises (random mix of all aspects)
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
          groups.map((group) => (
            <div key={group.title} className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {group.title}
              </div>
              {group.items.map((cat) => (
                <CountPicker
                  key={cat.key}
                  label={cat.label}
                  emoji={cat.emoji}
                  value={counts[cat.key]}
                  onChange={(n) => setCount(cat.key, n)}
                />
              ))}
            </div>
          ))
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-sm text-gray-500">Total exercises</div>
          <div className="text-3xl font-bold text-gray-800">{total}</div>
        </div>

        <button
          onClick={() => {
            if (total === 0) return;
            setStage("confirm");
          }}
          disabled={total === 0}
          className="w-full py-4 px-4 bg-emerald-600 text-white font-semibold rounded-2xl text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  if (stage === "confirm") {
    const choiceCount = Math.round((total * choicePercent) / 100);
    const fillCount = total - choiceCount;
    const selectedCats = groups
      .flatMap((g) => g.items)
      .filter((cat) => counts[cat.key] > 0);

    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Confirm drills</h1>
          <p className="text-gray-500">
            Check the plan, then choose how many questions are multiple choice.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Language</span>
            <span className="font-semibold text-gray-800">
              {language === "de" ? "German 🇩🇪" : "English 🇬🇧"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Mode</span>
            <span className="font-semibold text-gray-800">
              {pickMode === "mix" ? "Mixed (all aspects)" : "By category"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-semibold text-gray-800">{total}</span>
          </div>
          {pickMode === "categories" && selectedCats.length > 0 && (
            <ul className="text-sm text-gray-600 space-y-1 pt-1 border-t border-gray-100">
              {selectedCats.map((cat) => (
                <li key={cat.key} className="flex justify-between">
                  <span>
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="font-medium text-gray-800">
                    {counts[cat.key]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
          <div>
            <div className="text-sm font-semibold text-gray-700">
              Multiple choice
            </div>
            <p className="text-sm text-gray-500 mt-1">
              0% = only fill-in-the-blank. 100% = only multiple choice.
            </p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <label className="text-4xl font-bold text-emerald-700 tabular-nums">
              {choicePercent}
              <span className="text-xl font-semibold text-gray-500">%</span>
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={choicePercent}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setChoicePercent(Math.max(0, Math.min(100, Math.round(n))));
              }}
              className="w-24 rounded-xl border-2 border-gray-200 px-3 py-2 text-lg font-semibold text-gray-800 text-center focus:border-emerald-500 focus:outline-none"
              aria-label="Multiple choice percent"
            />
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={choicePercent}
            onChange={(e) => setChoicePercent(Number(e.target.value))}
            className="w-full accent-emerald-600"
            aria-label="Multiple choice percent slider"
          />

          <div className="grid grid-cols-5 gap-2">
            {CHOICE_PRESETS.map((n) => {
              const active = choicePercent === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setChoicePercent(n)}
                  className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    active
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-emerald-300"
                  }`}
                >
                  {n}%
                </button>
              );
            })}
          </div>

          <p className="text-sm text-gray-600 bg-emerald-50 rounded-xl px-3 py-2">
            {choicePercent === 0
              ? `All ${total} questions will be fill-in-the-blank.`
              : choicePercent === 100
                ? `All ${total} questions will be multiple choice (when enough options exist).`
                : `About ${choiceCount} of ${total} will be multiple choice, ${fillCount} fill-in-the-blank.`}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={startDrills}
            className="w-full py-4 px-4 bg-emerald-600 text-white font-semibold rounded-2xl text-lg hover:bg-emerald-700 transition-colors"
          >
            Generate drills
          </button>
          <button
            onClick={() => setStage("pick")}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
        </div>
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
        exercises={exercises}
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


