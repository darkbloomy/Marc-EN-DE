"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/contexts/ProfileContext";
import { Home, BookOpen, BarChart3, Award } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "" },
  { label: "Practice", icon: BookOpen, path: "/practice" },
  { label: "Progress", icon: BarChart3, path: "/progress" },
  { label: "Badges", icon: Award, path: "/badges" },
];

export function ProfileNav({
  orientation,
}: {
  orientation: "horizontal" | "vertical";
}) {
  const profile = useProfile();
  const pathname = usePathname();

  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      className={
        isHorizontal
          ? "flex items-center justify-around bg-white border-t border-gray-200 py-2 px-4"
          : "flex flex-col gap-1 p-4 flex-1"
      }
    >
      {NAV_ITEMS.map((item) => {
        const href = `/${profile.id}${item.path}`;
        const isActive =
          item.path === ""
            ? pathname === `/${profile.id}`
            : pathname.startsWith(href);

        return (
          <Link
            key={item.label}
            href={href}
            className={`flex items-center gap-3 rounded-xl transition-colors ${
              isHorizontal
                ? `flex-col gap-1 px-3 py-2 text-xs min-w-[60px] ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`
                : `px-4 py-3 ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`
            }`}
          >
            <item.icon size={isHorizontal ? 22 : 20} />
            <span className={isHorizontal ? "" : "font-medium"}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
