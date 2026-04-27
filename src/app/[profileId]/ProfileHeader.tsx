"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { getAvatar } from "@/lib/avatars";
import { ArrowLeftRight } from "lucide-react";

interface GamificationData {
  level: number;
  totalPoints: number;
}

export function ProfileHeader() {
  const profile = useProfile();
  const avatar = getAvatar(profile.avatarId);
  const [gamification, setGamification] = useState<GamificationData | null>(
    null
  );

  useEffect(() => {
    fetch(`/api/profiles/${profile.id}/gamification`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setGamification({
            level: json.data.level,
            totalPoints: json.data.totalPoints,
          });
        }
      })
      .catch(() => {
        // Silently fail — header still works without gamification data
      });
  }, [profile.id]);

  const levelText = gamification
    ? `Lvl ${gamification.level} · ${gamification.totalPoints} pts`
    : "";

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 lg:border-b-0 lg:p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{avatar?.emoji ?? "👤"}</span>
        <span className="font-semibold text-gray-800">{profile.name}</span>
      </div>
      <div className="flex items-center gap-4">
        {levelText && (
          <span className="text-sm text-gray-400">{levelText}</span>
        )}
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          title="Switch profile"
        >
          <ArrowLeftRight size={16} />
          <span className="hidden sm:inline">Switch</span>
        </Link>
      </div>
    </header>
  );
}
