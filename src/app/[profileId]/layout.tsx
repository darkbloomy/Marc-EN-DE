import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileNav } from "./ProfileNav";

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, name: true, avatarId: true },
  });

  if (!profile) {
    notFound();
  }

  return (
    <ProfileProvider profile={profile}>
      <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
          <ProfileHeader />
          <ProfileNav orientation="vertical" />
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <div className="lg:hidden">
            <ProfileHeader />
          </div>

          {/* Page content */}
          <main className="flex-1 p-4 pb-20 lg:pb-4">{children}</main>

          {/* Mobile bottom nav */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10">
            <ProfileNav orientation="horizontal" />
          </div>
        </div>
      </div>
    </ProfileProvider>
  );
}
