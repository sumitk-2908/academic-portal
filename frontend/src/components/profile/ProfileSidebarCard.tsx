import Link from "next/link";
import { Settings } from "lucide-react";

interface ProfileSidebarCardProps {
  userName: string;
  role: string;
}

export default function ProfileSidebarCard({ userName, role }: ProfileSidebarCardProps) {
  const initials = userName.substring(0, 2).toUpperCase() || "ST";

  return (
    <div className="mt-auto pt-4 pb-2">
      <Link 
        href="/profile"
        className="flex items-center gap-3 rounded-xl border border-border bg-[#FAFAF9] p-2 transition-colors hover:bg-surface dark:hover:bg-[#1e2133]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-xs font-bold text-white">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground dark:text-white truncate">{userName}</p>
          <p className="text-xs font-medium text-indigo-500 truncate">{role}</p>
        </div>
        <Settings size={14} className="shrink-0 text-gray-400 dark:text-muted" />
      </Link>
    </div>
  );
}