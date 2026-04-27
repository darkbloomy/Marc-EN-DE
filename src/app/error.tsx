"use client";

import { RotateCcw } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <span className="text-6xl mb-4">😅</span>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Something Went Wrong
      </h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        Don&apos;t worry, this happens sometimes. Let&apos;s try again!
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
      >
        <RotateCcw size={20} />
        Try Again
      </button>
    </div>
  );
}
