"use client";
import { useMemo } from "react";
import { Eye, BookOpen, Upload } from "lucide-react";

export default function ActivityTimeline({ history, bookmarks, uploads }: { history: any[], bookmarks: any[], uploads: any[] }) {
  
  const timeline = useMemo(() => {
    const combined: any[] = [];

    // Map history (views)
    history.forEach(h => combined.push({
      type: 'view',
      title: h.title,
      subject: h.subject,
      date: new Date(h.accessed_at || h.created_at),
      icon: Eye,
      color: "text-blue-500 bg-blue-500/10",
      actionText: "Studied"
    }));

    // Map bookmarks
    bookmarks.forEach(b => combined.push({
      type: 'bookmark',
      title: b.title,
      subject: b.subject,
      // For local storage we might only have created_at of the doc, 
      // but if we have the join table date, use that.
      date: new Date(b.bookmarked_at || b.created_at), 
      icon: BookOpen,
      color: "text-amber-500 bg-amber-500/10",
      actionText: "Bookmarked"
    }));

    // Map uploads
    uploads.forEach(u => combined.push({
      type: 'upload',
      title: u.title,
      subject: u.subject,
      date: new Date(u.created_at),
      icon: Upload,
      color: "text-emerald-500 bg-emerald-500/10",
      actionText: "Uploaded"
    }));

    // Sort newest to oldest
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [history, bookmarks, uploads]);

  if (timeline.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No recent activity found.</p>;
  }

  return (
    <div className="relative border-l-2 border-gray-100 dark:border-[#1F2A44] ml-3 md:ml-4 space-y-6 pb-4">
      {timeline.slice(0, 20).map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="relative pl-6 sm:pl-8">
            {/* Timeline Node */}
            <div className={`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white dark:border-[#0D0F1A] ${item.color}`}>
              <Icon size={12} />
            </div>
            
            {/* Content */}
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {item.actionText} <span className="text-gray-900 dark:text-white">{item.title}</span>
                </p>
                <time className="text-[10px] font-medium text-gray-400 shrink-0">
                  {item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </time>
              </div>
              <p className="text-xs text-[#64748B] capitalize">{item.subject}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}