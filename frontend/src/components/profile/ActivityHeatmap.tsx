"use client";
import { useMemo } from "react";

export default function ActivityHeatmap({ history }: { history: any[] }) {
  // Generate the last 90 days
  const days = useMemo(() => {
    const dates = [];
    const today = new Date();
    
    // Map history to get counts per day
    const activityMap: Record<string, number> = {};
    history.forEach(item => {
      // Use created_at or accessed_at depending on the data source
      const dateStr = new Date(item.accessed_at || item.created_at).toISOString().split('T')[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      dates.push({
        date: dateStr,
        count: activityMap[dateStr] || 0
      });
    }
    return dates;
  }, [history]);

  // UPDATED: High-contrast Emerald Green Palette
  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-100 dark:bg-gray-800/80"; // Empty day
    if (count === 1) return "bg-emerald-200 dark:bg-emerald-900/60"; // Low activity
    if (count <= 3) return "bg-emerald-400 dark:bg-emerald-700"; // Medium activity
    return "bg-emerald-600 dark:bg-emerald-500"; // High activity (4+ views)
  };

  return (
    <div className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
      <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Study Heatmap (90 Days)</h3>
      <div className="overflow-x-auto hide-scrollbar pb-2">
        <div className="flex gap-1.5 min-w-max">
          {days.map((day, idx) => (
            <div 
              key={idx} 
              title={`${day.count} items viewed on ${day.date}`}
              className={`h-3 w-3 sm:h-4 sm:w-4 rounded-[3px] sm:rounded-sm ${getColor(day.count)} transition-all hover:scale-110`} 
            />
          ))}
        </div>
      </div>
      
      {/* UPDATED: Legend to match the new green colors */}
      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
        <span>Less</span>
        <div className="h-2 w-2 rounded-sm bg-gray-100 dark:bg-gray-800/80" />
        <div className="h-2 w-2 rounded-sm bg-emerald-200 dark:bg-emerald-900/60" />
        <div className="h-2 w-2 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <div className="h-2 w-2 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}