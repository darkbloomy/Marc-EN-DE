"use client";

import { useState } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import type { GeneratedExercise, Language } from "@/lib/exercises/types";
import { getTopicsByLanguage, type Topic } from "@/lib/exercises/topics";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { SessionSummary } from "@/components/SessionSummary";
import { ArrowLeft, Loader2 } from "lucide-react";

type Stage = "pick-language" | "pick-topic" | "loading" | "practicing" | "summary";

interface ExerciseResultSummary {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  grammar: "Grammar",
  spelling: "Spelling",
  vocabulary: "Vocabulary",
  reading: "Reading",
  writing: "Writing",
};

const CATEGORY_EMOJI: Record<string, string> = {
  grammar: "📝",
  spelling: "✏️",
  vocabulary: "📚",
  reading: "📖",
  writing: "✍️",
};

export default function FreePracticePage() {
  const profile = useProfile();
  const [stage, setStage] = useState<Stage>("pick-language");
  const [language, setLanguage] = useState<Language>("de");
  const [exercises, setExercises] = useState<GeneratedExercise[]>([]);
  const [results, setResults] = useState<ExerciseResultSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectLanguage(lang: Language) {
    setLanguage(lang);
    setStage("pick-topic");
  }

  async function selectTopic(topic: Topic) {
    setStage("loading");
    setError(null);

    try {
      // Create session
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language,
          mode: "free",
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(sessionData.error ?? "Failed to create session");
      setSessionId(sessionData.data.id);

      // Build a free practice session (mixed types, adaptive difficulty)
      const buildRes = await fetch("/api/sessions/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          language,
          mode: "free",
          topicId: topic.id,
        }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) throw new Error(buildData.error ?? "Failed to build session");

      setExercises(buildData.data.exercises);
      setStage("practicing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("pick-topic");
    }
  }

  async function handleComplete(exerciseResults: ExerciseResultSummary[]) {
    setResults(exerciseResults);

    if (sessionId) {
      const totalPoints = exerciseResults.reduce((sum, r) => sum + r.pointsEarned, 0);

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
        <h1 className="text-2xl font-bold text-gray-800">Free Practice</h1>
        <p className="text-gray-500">Choose a language, then pick a topic</p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => selectLanguage("de")}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-400 hover:shadow-md transition-all"
          >
            <span className="text-5xl">🇩🇪</span>
            <span className="text-lg font-semibold text-gray-800">Deutsch</span>
          </button>

          <button
            onClick={() => selectLanguage("en")}
            className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-400 hover:shadow-md transition-all"
          >
            <span className="text-5xl">🇬🇧</span>
            <span className="text-lg font-semibold text-gray-800">English</span>
          </button>
        </div>
      </div>
    );
  }

  if (stage === "pick-topic") {
    const topics = getTopicsByLanguage(language);
    const grouped = topics.reduce<Record<string, Topic[]>>((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});

    return (
      <div className="max-w-lg mx-auto space-y-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStage("pick-language")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Pick a Topic {language === "de" ? "🇩🇪" : "🇬🇧"}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {Object.entries(grouped).map(([category, categoryTopics]) => (
          <div key={category} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <span>{CATEGORY_EMOJI[category]}</span>
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            <div className="space-y-2">
              {categoryTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => selectTopic(topic)}
                  className="w-full text-left p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="font-medium text-gray-800">
                    {topic.labelEN}
                  </div>
                  <div className="text-sm text-gray-500">{topic.labelDE}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < topic.difficulty ? "bg-emerald-400" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={48} className="text-emerald-500 animate-spin" />
        <p className="text-gray-500 text-lg">Generating exercises...</p>
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
