"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { TrueFalseExercise } from "@/lib/exercises/types";

interface TrueFalseProps {
  exercise: TrueFalseExercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
}

export function TrueFalse({
  exercise,
  onAnswer,
  disabled = false,
}: TrueFalseProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSubmit() {
    if (selected === null) return;
    setAnswered(true);
    const isCorrect = selected === exercise.isTrue;
    onAnswer(isCorrect, selected ? "true" : "false");
  }

  function getButtonStyle(value: boolean): string {
    if (answered) {
      if (value === exercise.isTrue) {
        return "bg-green-100 border-green-400 text-green-800";
      }
      if (value === selected && value !== exercise.isTrue) {
        return "bg-red-100 border-red-400 text-red-800";
      }
      return "bg-gray-50 border-gray-200 text-gray-400";
    }
    if (value === selected) {
      return "bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-300";
    }
    return "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100";
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-6">
        Is this statement true or false?
      </h2>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <p className="text-lg text-gray-800 text-center italic">
          &ldquo;{exercise.statement}&rdquo;
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => !answered && !disabled && setSelected(true)}
          disabled={answered || disabled}
          className={`flex flex-col items-center gap-2 py-4 px-6 rounded-xl border-2 transition-all min-h-[72px] ${getButtonStyle(true)}`}
        >
          <Check size={28} />
          <span className="font-semibold text-lg">True</span>
        </button>

        <button
          onClick={() => !answered && !disabled && setSelected(false)}
          disabled={answered || disabled}
          className={`flex flex-col items-center gap-2 py-4 px-6 rounded-xl border-2 transition-all min-h-[72px] ${getButtonStyle(false)}`}
        >
          <X size={28} />
          <span className="font-semibold text-lg">False</span>
        </button>
      </div>

      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={selected === null || disabled}
          className="mt-4 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check Answer
        </button>
      )}
    </div>
  );
}
