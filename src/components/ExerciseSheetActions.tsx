"use client";

import { Download, Printer } from "lucide-react";
import type { GeneratedExercise, Language } from "@/lib/exercises/types";
import {
  buildExerciseSheetHtml,
  buildSheetFilename,
  downloadExerciseSheetHtml,
  printExerciseSheetHtml,
} from "@/lib/exercises/sheet-html";

interface ExerciseSheetActionsProps {
  exercises: GeneratedExercise[];
  language: Language;
  title: string;
  mode?: string;
  className?: string;
}

export function ExerciseSheetActions({
  exercises,
  language,
  title,
  mode = "practice",
  className = "",
}: ExerciseSheetActionsProps) {
  const disabled = exercises.length === 0;

  function handleDownload() {
    if (disabled) return;
    const html = buildExerciseSheetHtml(exercises, { title, language, mode });
    downloadExerciseSheetHtml(html, buildSheetFilename(mode, language));
  }

  function handlePrint() {
    if (disabled) return;
    const html = buildExerciseSheetHtml(exercises, { title, language, mode });
    printExerciseSheetHtml(html);
  }

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      role="group"
      aria-label="Export exercise sheet"
    >
      <button
        type="button"
        onClick={handleDownload}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={16} />
        Download HTML
      </button>
      <button
        type="button"
        onClick={handlePrint}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Printer size={16} />
        Print
      </button>
    </div>
  );
}
