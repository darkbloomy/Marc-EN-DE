"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import type { FillInTheBlankExercise } from "@/lib/exercises/types";

interface FillInTheBlankProps {
  exercise: FillInTheBlankExercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
}

interface BlankMeta {
  correctAnswer: string;
  acceptableAnswers?: string[];
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matches(answer: string, meta: BlankMeta): boolean {
  const norm = normalize(answer);
  if (norm === normalize(meta.correctAnswer)) return true;
  return meta.acceptableAnswers?.some((a) => normalize(a) === norm) ?? false;
}

export function FillInTheBlank({
  exercise,
  onAnswer,
  disabled = false,
}: FillInTheBlankProps) {
  const blanksMeta: BlankMeta[] =
    exercise.blanks ??
    [
      {
        correctAnswer: exercise.correctAnswer,
        acceptableAnswers: exercise.acceptableAnswers,
      },
    ];

  const parts = exercise.sentence.split("___");
  const blankCount = parts.length - 1;

  const [answers, setAnswers] = useState<string[]>(() =>
    Array(blankCount).fill("")
  );
  const [showHint, setShowHint] = useState(false);
  const [answered, setAnswered] = useState(false);

  function setAnswerAt(i: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  const allFilled = answers.every((a) => a.trim().length > 0);
  const allCorrect = answers.every((a, i) => matches(a, blanksMeta[i]));

  function handleSubmit() {
    if (!allFilled || answered || disabled) return;
    setAnswered(true);
    const trimmed = answers.map((a) => a.trim());
    onAnswer(allCorrect, trimmed.join(" | "));
  }

  return (
    <div>
      <div className="text-lg text-gray-800 mb-4 leading-relaxed">
        {parts.map((part, i) => {
          const isLast = i === parts.length - 1;
          const inputIndex = i;
          const answerValue = answers[inputIndex] ?? "";
          const inputCorrect =
            answered && matches(answerValue, blanksMeta[inputIndex] ?? blanksMeta[0]);
          return (
            <span key={i}>
              {part}
              {!isLast && (
                <input
                  type="text"
                  value={answerValue}
                  onChange={(e) =>
                    !answered && setAnswerAt(inputIndex, e.target.value)
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  disabled={answered || disabled}
                  className={`inline-block mx-1 px-3 py-1 border-b-2 text-center text-lg font-medium w-32 focus:outline-none ${
                    answered
                      ? inputCorrect
                        ? "border-green-500 text-green-700 bg-green-50"
                        : "border-red-500 text-red-700 bg-red-50"
                      : "border-blue-400 text-gray-800 bg-blue-50 focus:border-blue-600"
                  }`}
                  placeholder="..."
                  autoFocus={inputIndex === 0}
                />
              )}
            </span>
          );
        })}
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
          disabled={!allFilled || disabled}
          className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check Answer
        </button>
      )}
    </div>
  );
}
