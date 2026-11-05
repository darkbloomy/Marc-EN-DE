"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { SessionSummary } from "@/components/SessionSummary";
import { toReviewItem, type StoredReviewResult } from "@/lib/sessions/review";

interface SessionPayload {
  profileId: string;
  completedAt: string | null;
  exerciseResults: StoredReviewResult[];
}

export default function SessionReviewPage() {
  const profile = useProfile();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${sessionId}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        const data = json.data as SessionPayload | undefined;
        if (!res.ok || !data || data.profileId !== profile.id || !data.completedAt) {
          setMissing(true);
          return;
        }
        setSession(data);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, profile.id]);

  if (missing) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-16">
        <h1 className="text-xl font-bold text-gray-800">Session not found</h1>
        <p className="text-gray-500">
          This practice is missing, still in progress, or belongs to another profile.
        </p>
        <Link
          href={`/${profile.id}`}
          className="inline-block text-blue-600 font-semibold hover:text-blue-700"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={48} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-lg">Loading your review...</p>
      </div>
    );
  }

  const items = session.exerciseResults.map(toReviewItem);

  return (
    <div className="py-8">
      <SessionSummary
        results={items.map((item) => item.result)}
        exercises={items.map((item) => item.exercise)}
        sources={items.map((item) => item.exercise.source)}
      />
    </div>
  );
}
