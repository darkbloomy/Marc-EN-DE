"use client";

import Link from "next/link";
import { useProfile } from "@/contexts/ProfileContext";
import { Trophy, CheckCircle, XCircle, RotateCcw, Home } from "lucide-react";

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

interface SessionSummaryProps {
  results: ExerciseResultSummary[];
  onPracticeAgain: () => void;
}

export function SessionSummary({
  results,
  onPracticeAgain,
}: SessionSummaryProps) {
  const profile = useProfile();

  const totalPoints = results.reduce((sum, r) => sum + r.pointsEarned, 0);
  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

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

  return (
    <div className="w-full max-w-md mx-auto text-center space-y-6">
      {/* Celebration */}
      <div>
        <span className="text-6xl">{emoji}</span>
        <h1 className="text-2xl font-bold text-gray-800 mt-3">
          Session Complete!
        </h1>
        <p className="text-gray-500 mt-1">{message}</p>
      </div>

      {/* Stats cards */}
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

      {/* Per-exercise breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="font-semibold text-gray-700 mb-3 text-left">
          Results
        </h2>
        <div className="space-y-2">
          {results.map((result, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-sm py-1"
            >
              {result.isCorrect ? (
                <CheckCircle size={18} className="text-green-500 shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 shrink-0" />
              )}
              <span className="text-gray-600 text-left">
                Question {i + 1}
              </span>
              {result.pointsEarned > 0 && (
                <span className="ml-auto text-green-600 font-medium">
                  +{result.pointsEarned}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onPracticeAgain}
          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <RotateCcw size={20} />
          Practice Again
        </button>
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
