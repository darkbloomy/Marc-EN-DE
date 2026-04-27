"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import {
  Flame,
  Star,
  BookOpen,
  PenTool,
  Rocket,
  Trophy,
  Medal,
  CheckCircle,
  Languages,
  Award,
  Sunrise,
  Moon,
  Calendar,
  Pencil,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AchievementDisplay {
  key: string;
  nameEN: string;
  nameDE: string;
  descriptionEN: string;
  descriptionDE: string;
  iconId: string;
  category: string;
  earnedAt: string | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  flame: Flame,
  star: Star,
  "book-open": BookOpen,
  "pen-tool": PenTool,
  pencil: Pencil,
  rocket: Rocket,
  trophy: Trophy,
  medal: Medal,
  "check-circle": CheckCircle,
  languages: Languages,
  award: Award,
  sunrise: Sunrise,
  moon: Moon,
  calendar: Calendar,
};

const CATEGORY_LABELS: Record<string, string> = {
  streak: "Streak Badges",
  mastery: "Mastery Badges",
  milestone: "Milestone Badges",
  special: "Special Badges",
};

const CATEGORY_ORDER = ["streak", "milestone", "mastery", "special"];

export default function BadgesPage() {
  const profile = useProfile();
  const [badges, setBadges] = useState<AchievementDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/achievements").then((r) => r.json()),
      fetch(`/api/profiles/${profile.id}/gamification`).then((r) => r.json()),
    ])
      .then(([allData, gamData]) => {
        const allAchievements: AchievementDisplay[] = (
          allData.data ?? []
        ).map(
          (a: {
            key: string;
            nameEN: string;
            nameDE: string;
            descriptionEN: string;
            descriptionDE: string;
            iconId: string;
            category: string;
          }) => ({
            ...a,
            earnedAt: null,
          })
        );

        const earned = gamData.data?.achievements ?? [];
        const earnedMap = new Map<string, string>();
        for (const e of earned) {
          earnedMap.set(e.key, e.earnedAt);
        }

        for (const badge of allAchievements) {
          const earnedAt = earnedMap.get(badge.key);
          if (earnedAt) badge.earnedAt = earnedAt;
        }

        setBadges(allAchievements);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <p className="text-gray-400">Loading badges...</p>
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    badges: badges.filter((b) => b.category === cat),
  })).filter((g) => g.badges.length > 0);

  const earnedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Badges</h1>
        <p className="text-gray-500 mt-1">
          {earnedCount} of {badges.length} earned
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.category} className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            {group.label}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {group.badges.map((badge) => {
              const IconComponent = ICON_MAP[badge.iconId] ?? Award;
              const isEarned = badge.earnedAt !== null;

              return (
                <div
                  key={badge.key}
                  className={`flex flex-col items-center p-4 rounded-xl border text-center ${
                    isEarned
                      ? "bg-white border-purple-200 shadow-sm"
                      : "bg-gray-50 border-gray-100 opacity-50"
                  }`}
                >
                  {isEarned ? (
                    <IconComponent
                      size={28}
                      className="text-purple-500 mb-2"
                    />
                  ) : (
                    <Lock size={28} className="text-gray-300 mb-2" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isEarned ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {badge.nameEN}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    {badge.descriptionEN}
                  </span>
                  {isEarned && badge.earnedAt && (
                    <span className="text-xs text-purple-400 mt-1">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
