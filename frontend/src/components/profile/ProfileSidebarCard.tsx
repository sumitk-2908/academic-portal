import Link from "next/link";
import { Settings } from "lucide-react";

interface ProfileSidebarCardProps {
  userName: string;
  role: string;
}

export default function ProfileSidebarCard({ userName, role }: ProfileSidebarCardProps) {
  const initials = userName.substring(0, 2).toUpperCase() || "ST";

  return (
    <div className="mt-auto pt-4 pb-2 animate-fade-up">
      <Link 
        href="/profile"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface-hover p-2 motion-hover motion-active hover:bg-surface"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{userName}</p>
          <p className="text-xs font-semibold text-primary truncate">{role}</p>
        </div>
        <Settings size={14} className="shrink-0 text-muted" />
      </Link>
    </div>
  );
}