import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAvatar } from "@/lib/avatars";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profiles = await prisma.profile.findMany({
    select: { id: true, name: true, avatarId: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-2">
          Who is practicing?
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Select your profile to get started
        </p>

        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-500 mb-6">
              No profiles yet. Create your first one!
            </p>
            <Link
              href="/profiles/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={24} />
              Create Your First Profile
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => {
                const avatar = getAvatar(profile.avatarId);
                return (
                  <Link
                    key={profile.id}
                    href={`/${profile.id}`}
                    className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <span className="text-5xl">
                      {avatar?.emoji ?? "👤"}
                    </span>
                    <span className="text-lg font-semibold text-gray-800">
                      {profile.name}
                    </span>
                  </Link>
                );
              })}

              <Link
                href="/profiles/new"
                className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[140px]"
              >
                <Plus size={32} className="text-gray-400" />
                <span className="text-gray-500 font-medium">
                  Add Profile
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
