"use client";

import Link from "next/link";
import { useProfile } from "@/contexts/ProfileContext";
import { getAvatar } from "@/lib/avatars";
import { BookOpen, Shuffle, Flame, Trophy, Clock } from "lucide-react";

export default function ProfileDashboard() {
  const profile = useProfile();
  const avatar = getAvatar(profile.avatarId);

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

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Flame size={24} className="text-orange-400 mb-2" />
          <span className="text-2xl font-bold text-gray-800">0</span>
          <span className="text-sm text-gray-500">Day Streak</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Trophy size={24} className="text-yellow-400 mb-2" />
          <span className="text-2xl font-bold text-gray-800">Lvl 1</span>
          <span className="text-sm text-gray-500">0 points</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Clock size={24} className="text-blue-400 mb-2" />
          <span className="text-2xl font-bold text-gray-800">--</span>
          <span className="text-sm text-gray-500">Last Practice</span>
        </div>
      </div>

      {/* Recent Activity placeholder */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Recent Activity</h2>
        <p className="text-gray-400 text-center py-4">
          Complete your first session to see activity here!
        </p>
      </div>
    </div>
  );
}
