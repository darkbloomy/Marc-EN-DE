"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import type { FillInTheBlankExercise } from "@/lib/exercises/types";

interface FillInTheBlankProps {
  exercise: FillInTheBlankExercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
}

export function FillInTheBlank({
  exercise,
  onAnswer,
  disabled = false,
}: FillInTheBlankProps) {
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);

  function checkAnswer(): boolean {
    const normalized = answer.trim().toLowerCase();
    if (normalized === exercise.correctAnswer.toLowerCase()) return true;
    if (
      exercise.acceptableAnswers?.some(
        (a) => a.toLowerCase() === normalized
      )
    )
      return true;
    return false;
  }

  function handleSubmit() {
    if (!answer.trim()) return;
    setAnswered(true);
    onAnswer(checkAnswer(), answer.trim());
  }

  // Split sentence at ___ to render inline input
  const parts = exercise.sentence.split("___");

  return (
    <div>
      <div className="text-lg text-gray-800 mb-4 leading-relaxed">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={answer}
                onChange={(e) => !answered && setAnswer(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !answered && handleSubmit()
                }
                disabled={answered || disabled}
                className={`inline-block mx-1 px-3 py-1 border-b-2 text-center text-lg font-medium w-32 focus:outline-none ${
                  answered
                    ? checkAnswer()
                      ? "border-green-500 text-green-700 bg-green-50"
                      : "border-red-500 text-red-700 bg-red-50"
                    : "border-blue-400 text-gray-800 bg-blue-50 focus:border-blue-600"
                }`}
                placeholder="..."
                autoFocus
              />
            )}
          </span>
        ))}
      </div>

      {exercise.hint && !answered && (
        <div className="mb-4">
          {showHint ? (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Lightbulb size={16} />
              {exercise.hint}
            </p>
          ) : (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Lightbulb size={16} />
              Show hint
            </button>
          )}
        </div>
      )}

      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || disabled}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check Answer
        </button>
      )}
    </div>
  );
}
