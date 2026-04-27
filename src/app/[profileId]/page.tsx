"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { getAvatar } from "@/lib/avatars";
import { BookOpen, Shuffle, Flame, Trophy, Award, Clock } from "lucide-react";

interface GamificationData {
  level: number;
  totalPoints: number;
  progressInLevel: number;
  bestStreak: number;
  achievements: { key: string; nameEN: string; earnedAt: string }[];
}

interface RecentSession {
  id: string;
  language: string;
  mode: string;
  completedAt: string;
  totalPoints: number;
  exerciseCount: number;
}

interface ProgressData {
  completedSessions: number;
  overallAccuracy: number;
  recentSessions: RecentSession[];
}

export default function ProfileDashboard() {
  const profile = useProfile();
  const avatar = getAvatar(profile.avatarId);
  const [gam, setGam] = useState<GamificationData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch(`/api/profiles/${profile.id}/gamification`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setGam(json.data);
      })
      .catch(() => {});

    fetch(`/api/profiles/${profile.id}/progress`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setProgress(json.data);
      })
      .catch(() => {});
  }, [profile.id]);

  const lastSession = progress?.recentSessions[0];
  const lastPracticeLabel = lastSession
    ? formatRelativeTime(lastSession.completedAt)
    : "--";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <span className="text-5xl">{avatar?.emoji ?? "👤"}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Hallo, {profile.name}!
          </h1>
          <p className="text-gray-500">Ready to practice today?</p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/${profile.id}/practice/daily`}
          className="flex items-center gap-4 p-6 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors text-left"
        >
          <BookOpen size={32} />
          <div>
            <div className="text-lg font-bold">Daily Practice</div>
            <div className="text-blue-200 text-sm">
              10-15 min guided session
            </div>
          </div>
        </Link>

        <Link
          href={`/${profile.id}/practice/free`}
          className="flex items-center gap-4 p-6 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-colors text-left"
        >
          <Shuffle size={32} />
          <div>
            <div className="text-lg font-bold">Free Practice</div>
            <div className="text-emerald-200 text-sm">
              Choose your own topic
            </div>
          </div>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Flame size={22} className="text-orange-400 mb-1" />
          <span className="text-xl font-bold text-gray-800">
            {gam?.bestStreak ?? 0}
          </span>
          <span className="text-xs text-gray-500">Day Streak</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Trophy size={22} className="text-yellow-400 mb-1" />
          <span className="text-xl font-bold text-gray-800">
            Lvl {gam?.level ?? 1}
          </span>
          <span className="text-xs text-gray-500">
            {gam?.totalPoints ?? 0} pts
          </span>
          {gam && gam.progressInLevel > 0 && gam.progressInLevel < 1 && (
            <div className="w-full mt-1.5 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-yellow-400 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round(gam.progressInLevel * 100)}%` }}
              />
            </div>
          )}
        </div>
        <Link
          href={`/${profile.id}/badges`}
          className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-purple-200 transition-colors"
        >
          <Award size={22} className="text-purple-400 mb-1" />
          <span className="text-xl font-bold text-gray-800">
            {gam?.achievements.length ?? 0}
          </span>
          <span className="text-xs text-gray-500">Badges</span>
        </Link>
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Clock size={22} className="text-blue-400 mb-1" />
          <span className="text-lg font-bold text-gray-800">
            {lastPracticeLabel}
          </span>
          <span className="text-xs text-gray-500">Last Practice</span>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Recent Sessions</h2>
          {progress && progress.completedSessions > 0 && (
            <Link
              href={`/${profile.id}/progress`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          )}
        </div>
        {progress && progress.recentSessions.length > 0 ? (
          <div className="space-y-2">
            {progress.recentSessions.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span>
                    {session.language === "de" ? "🇩🇪" : "🇬🇧"}
                  </span>
                  <div>
                    <span className="text-gray-700 capitalize">
                      {session.mode}
                    </span>
                    <div className="text-gray-400 text-xs">
                      {new Date(session.completedAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" }
                      )}
                    </div>
                  </div>
                </div>
                <span className="font-medium text-green-600">
                  +{session.totalPoints} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">
            Complete your first session to see activity here!
          </p>
        )}
      </div>

      {/* Recent Achievements */}
      {gam && gam.achievements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            Recent Achievements
          </h2>
          <div className="space-y-2">
            {gam.achievements.slice(0, 3).map((a) => (
              <div
                key={a.key}
                className="flex items-center gap-3 py-1 text-sm"
              >
                <Award size={18} className="text-purple-400 shrink-0" />
                <span className="text-gray-700">{a.nameEN}</span>
                <span className="ml-auto text-gray-400 text-xs">
                  {new Date(a.earnedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
