"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  BarChart3,
  CheckCircle,
  Target,
  Calendar,
  TrendingUp,
} from "lucide-react";

interface LanguageStat {
  language: string;
  total: number;
  correct: number;
  accuracy: number;
  totalPoints: number;
}

interface CategoryStat {
  category: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface TopicStat {
  topic: string;
  language: string;
  category: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface RecentSession {
  id: string;
  language: string;
  mode: string;
  completedAt: string;
  totalPoints: number;
  exerciseCount: number;
}

interface ActivityDay {
  date: string;
  sessions: number;
  points: number;
}

interface ProgressData {
  totalSessions: number;
  completedSessions: number;
  totalExercises: number;
  correctExercises: number;
  overallAccuracy: number;
  languageStats: LanguageStat[];
  categoryStats: CategoryStat[];
  topicStats: TopicStat[];
  recentSessions: RecentSession[];
  activityHeatmap: ActivityDay[];
}

const CATEGORY_LABELS: Record<string, string> = {
  grammar: "Grammar",
  spelling: "Spelling",
  vocabulary: "Vocabulary",
  reading: "Reading",
  writing: "Writing",
};

export default function ProgressPage() {
  const profile = useProfile();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profiles/${profile.id}/progress`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-gray-400">Loading progress...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Could not load progress data.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold text-gray-800">Progress</h1>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 size={20} className="text-blue-500" />}
          value={data.completedSessions}
          label="Sessions"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-green-500" />}
          value={data.correctExercises}
          label="Correct"
        />
        <StatCard
          icon={<Target size={20} className="text-orange-500" />}
          value={`${data.overallAccuracy}%`}
          label="Accuracy"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-purple-500" />}
          value={data.totalExercises}
          label="Exercises"
        />
      </div>

      {/* Activity heatmap */}
      <ActivityHeatmap activity={data.activityHeatmap} />

      {/* Language breakdown */}
      {data.languageStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">By Language</h2>
          <div className="space-y-4">
            {data.languageStats.map((lang) => (
              <div key={lang.language} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {lang.language === "de" ? "Deutsch" : "English"}{" "}
                    {lang.language === "de" ? "🇩🇪" : "🇬🇧"}
                  </span>
                  <span className="text-gray-500">
                    {lang.accuracy}% ({lang.correct}/{lang.total})
                  </span>
                </div>
                <ProgressBar value={lang.accuracy} color="blue" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {data.categoryStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">By Category</h2>
          <div className="space-y-4">
            {data.categoryStats.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {CATEGORY_LABELS[cat.category] ?? cat.category}
                  </span>
                  <span className="text-gray-500">
                    {cat.accuracy}% ({cat.correct}/{cat.total})
                  </span>
                </div>
                <ProgressBar value={cat.accuracy} color="emerald" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic performance */}
      {data.topicStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">
            Topic Performance
          </h2>
          <div className="space-y-3">
            {data.topicStats
              .sort((a, b) => b.total - a.total)
              .slice(0, 10)
              .map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <div>
                    <span className="text-gray-700">
                      {formatTopicName(topic.topic)}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">
                      {topic.language === "de" ? "🇩🇪" : "🇬🇧"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        topic.accuracy >= 80
                          ? "text-green-600"
                          : topic.accuracy >= 60
                            ? "text-yellow-600"
                            : "text-red-500"
                      }`}
                    >
                      {topic.accuracy}%
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({topic.total})
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {data.recentSessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Sessions</h2>
          <div className="space-y-3">
            {data.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span>{session.language === "de" ? "🇩🇪" : "🇬🇧"}</span>
                  <div>
                    <span className="text-gray-700 capitalize">
                      {session.mode} Practice
                    </span>
                    <div className="text-gray-400 text-xs">
                      {new Date(session.completedAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium text-gray-700">
                    +{session.totalPoints} pts
                  </span>
                  <div className="text-gray-400 text-xs">
                    {session.exerciseCount} exercises
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.completedSessions === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400">
            Complete your first session to see progress here!
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="mb-1">{icon}</div>
      <span className="text-xl font-bold text-gray-800">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: "blue" | "emerald";
}) {
  const bgColor = color === "blue" ? "bg-blue-500" : "bg-emerald-500";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`${bgColor} h-2 rounded-full transition-all`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function ActivityHeatmap({ activity }: { activity: ActivityDay[] }) {
  // Generate last 30 days
  const days: { date: string; sessions: number; points: number }[] = [];
  const activityMap = new Map(activity.map((a) => [a.date, a]));

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    const dayData = activityMap.get(dateKey);
    days.push({
      date: dateKey,
      sessions: dayData?.sessions ?? 0,
      points: dayData?.points ?? 0,
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-gray-400" />
        <h2 className="font-semibold text-gray-800">Last 30 Days</h2>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.sessions} session${day.sessions !== 1 ? "s" : ""}`}
            className={`aspect-square rounded-sm ${
              day.sessions === 0
                ? "bg-gray-100"
                : day.sessions === 1
                  ? "bg-green-200"
                  : day.sessions === 2
                    ? "bg-green-400"
                    : "bg-green-600"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-green-200" />
        <div className="w-3 h-3 rounded-sm bg-green-400" />
        <div className="w-3 h-3 rounded-sm bg-green-600" />
        <span>More</span>
      </div>
    </div>
  );
}

function formatTopicName(topicId: string): string {
  return topicId
    .replace(/^(de|en)_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
