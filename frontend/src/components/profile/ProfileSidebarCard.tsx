import Link from "next/link";


interface ProfileSidebarCardProps {
  userName: string;
  role: string;
}

export default function ProfileSidebarCard({ userName, role }: ProfileSidebarCardProps) {
  const initials = userName === "Student" ? "ST" : (userName.substring(0, 2).toUpperCase() || "ST");

  return (
    <div className="animate-fade-up mt-auto pt-4 pb-2">
      <Link 
        href="/profile"
        className="motion-hover motion-active flex items-center gap-3 rounded-xl border border-border bg-surface-hover p-2 hover:bg-surface"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{userName}</p>
          <p className="truncate text-xs font-semibold text-primary">{role}</p>
        </div>

      </Link>
    </div>
  );
}