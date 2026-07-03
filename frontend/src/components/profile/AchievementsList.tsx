"use client";
import { Medal, UploadCloud, Flame, Download, Star } from "lucide-react";

// Master list of all possible badges
const ALL_BADGES = [
  { id: "pioneer", title: "Pioneer", description: "Uploaded your first resource", icon: UploadCloud, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "streak_7", title: "7 Day Streak", description: "Studied for 7 consecutive days", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "downloads_100", title: "Impact Maker", description: "Reached 100 total downloads", icon: Download, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "contributor", title: "Top Contributor", description: "Uploaded 10+ approved resources", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "scholar", title: "Scholar", description: "Viewed 50 unique documents", icon: Medal, color: "text-purple-500", bg: "bg-purple-500/10" },
];

export default function AchievementsList({ achievements }: { achievements: any[] }) {
  // Extract just the badge_types the user has earned
  const earnedBadgeIds = achievements.map((a) => a.badge_type);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
      {ALL_BADGES.map((badge) => {
        const isEarned = earnedBadgeIds.includes(badge.id);
        const Icon = badge.icon;

        return (
          <div
            key={badge.id}
            className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4 rounded-2xl border p-3 sm:p-4 transition-all ${
              isEarned
                ? "border-border bg-surface"
                : "border-dashed border-border bg-gray-50/50 opacity-60 grayscale"
            }`}
          >
            <div
              className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${
                isEarned ? badge.bg : "bg-gray-200"
              }`}
            >
              <Icon
                className={`h-5 w-5 sm:h-6 sm:w-6 ${
                  isEarned ? badge.color : "text-gray-400"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0 w-full">
              <h4 className="mb-0.5 truncate text-xs font-bold text-foreground sm:text-sm">
                {badge.title}
              </h4>

              <p className="line-clamp-2 text-xs text-muted leading-tight">
                {badge.description}
              </p>

              {isEarned && (
                <div className="mt-2 inline-block rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-600 sm:px-2">
                  Unlocked
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}