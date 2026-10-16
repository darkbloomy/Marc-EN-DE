"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/contexts/ProfileContext";
import { Trophy, CheckCircle, XCircle, RotateCcw, Home, Database, Loader2 } from "lucide-react";
import type { GeneratedExercise } from "@/lib/exercises/types";
import {
  getExerciseCorrectAnswer,
  getExerciseQuestionText,
} from "@/lib/exercises/content-hash";

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

interface SessionSummaryProps {
  results: ExerciseResultSummary[];
  exercises?: GeneratedExercise[];
  sources?: Array<"ai" | "db" | "fallback" | undefined>;
  onPracticeAgain: () => void;
  /** When provided, shows a "Save to pool" button (AI-built sessions). */
  onSaveToPool?: () => void;
  poolState?: "idle" | "saving" | "saved";
}

type ReviewFilter = "all" | "wrong" | "correct";

export function SessionSummary({
  results,
  exercises,
  sources,
  onPracticeAgain,
  onSaveToPool,
  poolState = "idle",
}: SessionSummaryProps) {
  const profile = useProfile();
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const totalPoints = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const wrongCount = totalCount - correctCount;

  const sourceCounts = (sources ?? []).reduce(
    (acc, s) => {
      if (s === "ai") acc.ai += 1;
      else if (s === "db") acc.db += 1;
      else if (s === "fallback") acc.fallback += 1;
      return acc;
    },
    { ai: 0, db: 0, fallback: 0 }
  );
  const sourceChips = [
    sourceCounts.ai > 0 ? `✨ ${sourceCounts.ai} fresh (AI)` : null,
    sourceCounts.db > 0 ? `📚 ${sourceCounts.db} from pool` : null,
    sourceCounts.fallback > 0 ? `🛟 ${sourceCounts.fallback} fallback` : null,
  ].filter(Boolean) as string[];

  let message: string;
  let emoji: string;
  if (accuracy === 100) {
    message = "Perfect score! Amazing!";
    emoji = "🌟";
  } else if (accuracy >= 80) {
    message = "Great job! Keep it up!";
    emoji = "🎉";
  } else if (accuracy >= 60) {
    message = "Good effort! Practice makes perfect!";
    emoji = "💪";
  } else {
    message = "Keep practicing, you'll get better!";
    emoji = "📚";
  }

  const showReview = Boolean(exercises && exercises.length > 0);
  const visibleIndexes = results
    .map((result, i) => i)
    .filter((i) => {
      if (filter === "wrong") return !results[i].isCorrect;
      if (filter === "correct") return results[i].isCorrect;
      return true;
    });

  return (
    <div className="w-full max-w-2xl mx-auto text-center space-y-6">
      <div>
        <span className="text-6xl">{emoji}</span>
        <h1 className="text-2xl font-bold text-gray-800 mt-3">
          Session Complete!
        </h1>
        <p className="text-gray-500 mt-1">{message}</p>
        {sourceChips.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {sourceChips.map((chip) => (
              <span
                key={chip}
                className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <Trophy size={24} className="text-yellow-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-800">{totalPoints}</div>
          <div className="text-xs text-gray-500">Points</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <CheckCircle size={24} className="text-green-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-800">
            {correctCount}/{totalCount}
          </div>
          <div className="text-xs text-gray-500">Correct</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-800 mt-1">
            {accuracy}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Accuracy</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-gray-700 text-left">Review</h2>
          {showReview && (
            <div className="flex gap-1">
              {(
                [
                  { id: "all" as const, label: `All (${totalCount})` },
                  { id: "wrong" as const, label: `Wrong (${wrongCount})` },
                  { id: "correct" as const, label: `Right (${correctCount})` },
                ] as const
              ).map((opt) => {
                const active = filter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFilter(opt.id)}
                    className={`text-xs font-semibold rounded-full px-3 py-1 border transition-colors ${
                      active
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {visibleIndexes.length === 0 && (
            <p className="text-sm text-gray-500 text-left py-2">
              No questions in this filter.
            </p>
          )}
          {visibleIndexes.map((i) => {
            const result = results[i];
            const exercise = exercises?.[i]?.exercise;
            const question = exercise
              ? getExerciseQuestionText(exercise)
              : `Question ${i + 1}`;
            const correctAnswer = exercise
              ? getExerciseCorrectAnswer(exercise)
              : undefined;

            return (
              <div
                key={i}
                className={`rounded-xl border p-3 text-left ${
                  result.isCorrect
                    ? "bg-green-50 border-green-100"
                    : "bg-red-50 border-red-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.isCorrect ? (
                    <CheckCircle
                      size={18}
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                  ) : (
                    <XCircle
                      size={18}
                      className="text-red-500 shrink-0 mt-0.5"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-gray-500 shrink-0 mt-0.5">
                        {i + 1}.
                      </span>
                      <p className="text-sm font-medium text-gray-800">
                        {question}
                      </p>
                      {result.pointsEarned > 0 && (
                        <span className="ml-auto shrink-0 text-green-600 font-medium text-sm">
                          +{result.pointsEarned}
                        </span>
                      )}
                    </div>
                    {showReview && (
                      <>
                        <p className="text-sm text-gray-700">
                          Your answer:{" "}
                          <span className="font-semibold">
                            {result.userAnswer || "—"}
                          </span>
                        </p>
                        {correctAnswer &&
                          (!result.isCorrect ||
                            normalize(result.userAnswer) !==
                              normalize(correctAnswer)) && (
                            <p className="text-sm text-gray-700">
                              Correct:{" "}
                              <span className="font-semibold">
                                {correctAnswer}
                              </span>
                            </p>
                          )}
                        {!result.isCorrect && exercise?.explanation && (
                          <p className="text-sm text-gray-600 pt-1">
                            {exercise.explanation}
                          </p>
                        )}
                        {!result.isCorrect && exercise?.explanationCN && (
                          <p className="text-sm text-gray-500">
                            {exercise.explanationCN}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onPracticeAgain}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <RotateCcw size={20} />
          Practice Again
        </button>
        {onSaveToPool && (
          <button
            onClick={onSaveToPool}
            disabled={poolState !== "idle"}
            className={`flex items-center justify-center gap-2 w-full py-3 font-semibold rounded-xl transition-colors ${
              poolState === "saved"
                ? "bg-green-100 text-green-700 cursor-default"
                : "bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-60"
            }`}
          >
            {poolState === "saved" ? (
              <>
                <CheckCircle size={20} />
                Saved to pool
              </>
            ) : poolState === "saving" ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Database size={20} />
                Save to pool
              </>
            )}
          </button>
        )}
        <Link
          href={`/${profile.id}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Home size={20} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
