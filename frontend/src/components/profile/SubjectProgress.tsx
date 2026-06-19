"use client";
import { useMemo } from "react";

export default function SubjectProgress({ history }: { history: any[] }) {
  const subjectStats = useMemo(() => {
    const stats: Record<string, { viewed: Set<number> }> = {};
    
    history.forEach(item => {
      if (!item.subject) return;
      if (!stats[item.subject]) {
        stats[item.subject] = { viewed: new Set() };
      }
      stats[item.subject].viewed.add(item.id);
    });

    return Object.entries(stats)
      .map(([subject, data]) => ({
        subject,
        // Since we don't fetch total resources per subject up front, 
        // we use a baseline. E.g., assume 20 core resources per subject.
        // In a full implementation, this divides by a fetched `totalDocs` count.
        percentage: Math.min(Math.round((data.viewed.size / 10) * 100), 100),
        viewed: data.viewed.size
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 4); // Show top 4 active subjects
  }, [history]);

  if (subjectStats.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
      <h3 className="mb-4 text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Subject Progress</h3>
      <div className="space-y-4">
        {subjectStats.map((stat, idx) => (
          <div key={idx}>
            <div className="mb-1 flex justify-between text-xs font-bold text-gray-900 dark:text-white">
              <span className="capitalize">{stat.subject}</span>
              <span>{stat.percentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-[#0D0F1A]">
              <div 
                className="h-full rounded-full bg-[#4F46E5] transition-all duration-1000 ease-out" 
                style={{ width: `${stat.percentage}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}