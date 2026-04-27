import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={40} className="text-blue-500 animate-spin" />
    </div>
  );
}
