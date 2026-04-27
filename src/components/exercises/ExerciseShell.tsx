"use client";

interface ExerciseShellProps {
  currentIndex: number;
  totalCount: number;
  children: React.ReactNode;
}

export function ExerciseShell({
  currentIndex,
  totalCount,
  children,
}: ExerciseShellProps) {
  const progress = ((currentIndex + 1) / totalCount) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>
            Question {currentIndex + 1} of {totalCount}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Exercise content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {children}
      </div>
    </div>
  );
}
