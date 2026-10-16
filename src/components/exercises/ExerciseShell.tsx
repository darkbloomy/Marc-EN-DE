"use client";

import type { Language } from "@/lib/exercises/types";
import { useWordLookup } from "./useWordLookup";
import { WordLookupPopover } from "./WordLookupPopover";

interface ExerciseShellProps {
  currentIndex: number;
  totalCount: number;
  /** Enables the double-click / double-tap dictionary for this exercise language. */
  language?: Language;
  children: React.ReactNode;
}

export function ExerciseShell({
  currentIndex,
  totalCount,
  language,
  children,
}: ExerciseShellProps) {
  const progress = ((currentIndex + 1) / totalCount) * 100;
  const lookup = useWordLookup(language, currentIndex);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>
            Question {currentIndex + 1} of {totalCount}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {language && (
          <p className="mt-1 text-xs text-gray-400">
            Tip: double-tap any word to look it up.
          </p>
        )}
      </div>

      {/* Exercise content */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 touch-manipulation"
        {...lookup.handlers}
      >
        {children}
      </div>

      {lookup.state && (
        <WordLookupPopover state={lookup.state} onClose={lookup.close} />
      )}
    </div>
  );
}
