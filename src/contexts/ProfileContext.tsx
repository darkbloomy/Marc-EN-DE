"use client";

import { createContext, useContext } from "react";

export interface ProfileData {
  id: string;
  name: string;
  avatarId: string;
}

const ProfileContext = createContext<ProfileData | null>(null);

export function ProfileProvider({
  profile,
  children,
}: {
  profile: ProfileData;
  children: React.ReactNode;
}) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileData {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
