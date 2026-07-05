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
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all sm:flex-row sm:items-start sm:gap-4 sm:p-4 sm:text-left ${
              isEarned
                ? "border-border bg-surface shadow-sm"
                : "border-dashed border-border bg-surface-hover opacity-75 grayscale"
            }`}
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12 ${
                isEarned ? badge.bg : "bg-background"
              }`}
            >
              <Icon
                className={`size-5 sm:size-6 ${
                  isEarned ? badge.color : "text-gray-400"
                }`}
              />
            </div>

            <div className="w-full min-w-0 flex-1">
              <h4 className="mb-0.5 truncate text-xs font-bold text-foreground sm:text-sm">
                {badge.title}
              </h4>

              <p className="line-clamp-2 text-xs leading-tight text-muted">
                {badge.description}
              </p>

              {isEarned && (
                <div className="mt-2 inline-block rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-bold tracking-wider text-emerald-600 uppercase sm:px-2">
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