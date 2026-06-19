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
        className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] p-2 transition-colors hover:bg-white dark:border-[#1F2A44] dark:bg-[#131625] dark:hover:bg-[#1e2133]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-[10px] font-bold text-white">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{userName}</p>
          <p className="text-[10px] font-medium text-indigo-500 truncate">{role}</p>
        </div>
        <Settings size={14} className="shrink-0 text-gray-400 dark:text-gray-500" />
      </Link>
    </div>
  );
}