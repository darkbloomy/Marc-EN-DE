import { Loader2 } from "lucide-react";

export default function ProgressLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 size={36} className="text-blue-500 animate-spin" />
      <p className="text-gray-400">Loading progress...</p>
    </div>
  );
}
