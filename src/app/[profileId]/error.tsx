"use client";

import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";

export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <span className="text-5xl mb-4">🤔</span>
      <h1 className="text-xl font-bold text-gray-800 mb-2">
        Oops, Something Broke!
      </h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        No worries — let&apos;s try loading this page again.
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <RotateCcw size={20} />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Home size={20} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
