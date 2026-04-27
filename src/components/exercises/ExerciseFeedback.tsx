"use client";

import { CheckCircle, XCircle } from "lucide-react";

interface ExerciseFeedbackProps {
  isCorrect: boolean;
  explanation: string;
  correctAnswer?: string;
  pointsEarned: number;
  onNext: () => void;
}

export function ExerciseFeedback({
  isCorrect,
  explanation,
  correctAnswer,
  pointsEarned,
  onNext,
}: ExerciseFeedbackProps) {
  return (
    <div
      className={`rounded-xl p-4 mt-4 ${
        isCorrect
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isCorrect ? (
          <CheckCircle className="text-green-600" size={24} />
        ) : (
          <XCircle className="text-red-600" size={24} />
        )}
        <span
          className={`font-bold text-lg ${
            isCorrect ? "text-green-700" : "text-red-700"
          }`}
        >
          {isCorrect ? "Correct!" : "Not quite!"}
        </span>
        {pointsEarned > 0 && (
          <span className="ml-auto text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
            +{pointsEarned} pts
          </span>
        )}
      </div>

      {!isCorrect && correctAnswer && (
        <p className="text-sm text-red-700 mb-2">
          Correct answer: <span className="font-semibold">{correctAnswer}</span>
        </p>
      )}

      <p className="text-sm text-gray-700">{explanation}</p>

      <button
        onClick={onNext}
        className="mt-4 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
