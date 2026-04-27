"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATARS } from "@/lib/avatars";

export default function NewProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (name.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (name.length > 30) {
      setError("Name must be at most 30 characters");
      return;
    }
    if (!avatarId) {
      setError("Please select an avatar");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Something went wrong");
        return;
      }
      router.push(`/${json.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Create Profile</h1>
        <p className="text-gray-500 text-center mb-8">
          Choose a name and pick your avatar!
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={30}
              autoFocus
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-3">
              Choose Your Avatar
            </p>
            <div className="grid grid-cols-5 gap-3">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setAvatarId(avatar.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl min-h-[64px] min-w-[64px] transition-all ${
                    avatarId === avatar.id
                      ? "bg-blue-100 ring-2 ring-blue-500 scale-110"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  aria-label={avatar.label}
                >
                  <span className="text-3xl">{avatar.emoji}</span>
                  <span className="text-xs text-gray-600 mt-1">
                    {avatar.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Creating..." : "Let's Go!"}
          </button>
        </form>
      </div>
    </main>
  );
}
