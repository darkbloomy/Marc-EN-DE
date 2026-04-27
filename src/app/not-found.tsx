import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <span className="text-6xl mb-4">🔍</span>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Page Not Found
      </h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        Oops! We couldn&apos;t find what you were looking for. Let&apos;s go back home.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
      >
        <Home size={20} />
        Back to Home
      </Link>
    </main>
  );
}
