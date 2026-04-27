import { Loader2 } from "lucide-react";

export default function ProfileLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={36} className="text-blue-500 animate-spin" />
    </div>
  );
}
