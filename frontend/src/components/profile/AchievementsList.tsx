"use client";
import { Medal, UploadCloud, Flame, Download, Star } from "lucide-react";

// Master list of all possible badges
const ALL_BADGES = [
  { id: 'pioneer', title: 'Pioneer', description: 'Uploaded your first resource', icon: UploadCloud, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'streak_7', title: '7 Day Streak', description: 'Studied for 7 consecutive days', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'downloads_100', title: 'Impact Maker', description: 'Reached 100 total downloads', icon: Download, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'contributor', title: 'Top Contributor', description: 'Uploaded 10+ approved resources', icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'scholar', title: 'Scholar', description: 'Viewed 50 unique documents', icon: Medal, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

export default function AchievementsList({ achievements }: { achievements: any[] }) {
  // Extract just the badge_types the user has earned
  const earnedBadgeIds = achievements.map(a => a.badge_type);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ALL_BADGES.map((badge) => {
        const isEarned = earnedBadgeIds.includes(badge.id);
        const Icon = badge.icon;

        return (
          <div 
            key={badge.id} 
            className={`flex items-start gap-4 rounded-2xl border p-4 transition-all ${
              isEarned 
                ? "border-[#E5E7EB] bg-white dark:border-[#1F2A44] dark:bg-[#131625]" 
                : "border-dashed border-gray-200 bg-gray-50/50 opacity-60 grayscale dark:border-[#1F2A44] dark:bg-[#0D0F1A]"
            }`}
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isEarned ? badge.bg : 'bg-gray-200 dark:bg-[#1F2A44]'}`}>
              <Icon size={24} className={isEarned ? badge.color : 'text-gray-400 dark:text-gray-500'} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{badge.title}</h4>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{badge.description}</p>
              {isEarned && (
                <div className="mt-2 inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
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