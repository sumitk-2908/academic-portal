"use client";
import { useMemo } from "react";
import { Eye, BookOpen, Upload } from "lucide-react";

export default function ActivityTimeline({
  history,
  bookmarks,
  uploads,
}: {
  history: any[];
  bookmarks: any[];
  uploads: any[];
}) {
  const timeline = useMemo(() => {
    const combined: any[] = [];

    // Map history (views)
    history.forEach((h) =>
      combined.push({
        type: "view",
        title: h.title,
        subject: h.subject,
        date: new Date(h.accessed_at || h.created_at),
        icon: Eye,
        color: "text-primary bg-primary/10",
        actionText: "Studied",
      })
    );

    // Map bookmarks
    bookmarks.forEach((b) =>
      combined.push({
        type: "bookmark",
        title: b.title,
        subject: b.subject,
        date: new Date(b.bookmarked_at || b.created_at),
        icon: BookOpen,
        color: "text-warning bg-warning/10",
        actionText: "Bookmarked",
      })
    );

    // Map uploads
    uploads.forEach((u) =>
      combined.push({
        type: "upload",
        title: u.title,
        subject: u.subject,
        date: new Date(u.created_at),
        icon: Upload,
        color: "text-success bg-success/10",
        actionText: "Uploaded",
      })
    );

    // Sort newest to oldest
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [history, bookmarks, uploads]);

  if (timeline.length === 0) {
    return (
      <p className="py-8 text-center text-sm font-medium text-muted">
        No recent activity found.
      </p>
    );
  }

  return (
    <div className="relative ml-3 space-y-6 border-l-2 border-border pb-4 md:ml-4 animate-fade-up">
      {timeline.slice(0, 20).map((item, idx) => {
        const Icon = item.icon;

        return (
          <div key={idx} className="relative pl-6 sm:pl-8">
            {/* Timeline Node */}
            <div
              className={`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-background ${item.color}`}
            >
              <Icon size={12} />
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm font-bold text-muted">
                  {item.actionText}{" "}
                  <span className="text-foreground">{item.title}</span>
                </p>

                <time className="shrink-0 text-sm font-medium tabular-nums text-muted">
                  {item.date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {item.subject}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}