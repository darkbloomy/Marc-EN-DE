"use client";

import { useState } from "react";
import type { FreeTextExercise } from "@/lib/exercises/types";

interface FreeTextProps {
  exercise: FreeTextExercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
}

export function FreeText({
  exercise,
  onAnswer,
  disabled = false,
}: FreeTextProps) {
  const [answer, setAnswer] = useState("");
  const [answered, setAnswered] = useState(false);

  function handleSubmit() {
    if (!answer.trim()) return;
    setAnswered(true);
    // Free text is self-checked — always counts as "correct" if they wrote something
    onAnswer(true, answer.trim());
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {exercise.prompt}
      </h2>

      <textarea
        value={answer}
        onChange={(e) => !answered && setAnswer(e.target.value)}
        disabled={answered || disabled}
        placeholder="Write your answer here..."
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
      />

      {answered && (
        <div className="mt-4 space-y-3">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">
              Sample Answer:
            </h3>
            <p className="text-blue-700">{exercise.sampleAnswer}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">
              Check your answer for:
            </h3>
            <ul className="space-y-1">
              {exercise.keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || disabled}
          className="mt-4 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Submit
        </button>
      )}
    </div>
  );
}
