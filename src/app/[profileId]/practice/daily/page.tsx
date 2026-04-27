"use client";

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise, Language } from "@/lib/exercises/types";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { SessionSummary } from "@/components/SessionSummary";
import { Loader2 } from "lucide-react";

type Stage = "pick-language" | "loading" | "practicing" | "summary";

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

export default function DailyPracticePage() {
  const profile = useProfile();
  const [stage, setStage] = useState<Stage>("pick-language");
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [results, setResults] = useState<ExerciseResultSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startSession(language: Language) {
    setStage("loading");
    setError(null);

    try {
      // Create session in DB
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language,
          mode: "daily",
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error ?? "Failed to create session");
      setSessionId(sessionData.data.id);

      // Generate exercises
      const genRes = await fetch("/api/exercises/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: `${language}_vocabulary_${language === "de" ? "school" : "everyday"}`,
          exerciseType: "multiple_choice",
          count: 6,
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error ?? "Failed to generate exercises");

      setExercises(genData.data.exercises);
      setStage("practicing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("pick-language");
    }
  }

  async function handleComplete(exerciseResults: ExerciseResultSummary[]) {
    setResults(exerciseResults);

    // Save individual results and complete session
    if (sessionId) {
      const totalPoints = exerciseResults.reduce((sum, r) => sum + r.pointsEarned, 0);

      // Save each result
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
            question: "question" in ex.exercise ? ex.exercise.question : ex.exercise.type,
            userAnswer: result.userAnswer,
            correctAnswer: getCorrectAnswer(ex),
            isCorrect: result.isCorrect,
            pointsEarned: result.pointsEarned,
            timeSpentSec: 0,
          }),
        });
      }

      // Complete session
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
    setStage("pick-language");
    setExercises([]);
    setResults([]);
    setSessionId(null);
    setError(null);
  }

  if (stage === "pick-language") {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800">Daily Practice</h1>
        <p className="text-gray-500">Choose your language for today&apos;s session</p>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => startSession("de")}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <span className="text-5xl">🇩🇪</span>
            <span className="text-lg font-semibold text-gray-800">Deutsch</span>
            <span className="text-sm text-gray-500">German</span>
          </button>

          <button
            onClick={() => startSession("en")}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <span className="text-5xl">🇬🇧</span>
            <span className="text-lg font-semibold text-gray-800">English</span>
            <span className="text-sm text-gray-500">Englisch</span>
          </button>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={48} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-lg">Generating your exercises...</p>
      </div>
    );
  }

  if (stage === "practicing") {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <ExerciseRenderer exercises={exercises} onComplete={handleComplete} />
      </div>
    );
  }

  // summary
  return (
    <div className="py-8">
      <SessionSummary results={results} onPracticeAgain={handlePracticeAgain} />
    </div>
  );
}

function getCorrectAnswer(ex: GeneratedExercise): string {
  switch (ex.exercise.type) {
    case "multiple_choice":
      return ex.exercise.options[ex.exercise.correctIndex];
    case "fill_in_the_blank":
      return ex.exercise.correctAnswer;
    case "true_false":
      return ex.exercise.isTrue ? "True" : "False";
    case "reorder":
      return ex.exercise.correctOrder.join(" ");
    case "free_text":
      return ex.exercise.sampleAnswer;
  }
}
