"use client";
import { useMemo } from "react";

export default function ActivityHeatmap({ history }: { history: any[] }) {
  // You can change this to 180 or 365 if you want a longer GitHub-style history
  const DAYS_TO_RENDER = 90; 

  const { days, startPadding } = useMemo(() => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const activityMap: Record<string, number> = {};
    history.forEach(item => {
      const dateStr = new Date(item.accessed_at || item.created_at).toISOString().split('T')[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    for (let i = DAYS_TO_RENDER - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      dates.push({
        date: dateStr,
        count: activityMap[dateStr] || 0,
        jsDate: d
      });
    }

    // Determine what day of the week the oldest date is (0 = Sunday, 6 = Saturday)
    // We use this to pad the first column so the grid strictly aligns with Mon/Wed/Fri labels
    const padding = dates.length > 0 ? dates[0].jsDate.getDay() : 0;

    return { days: dates, startPadding: padding };
  }, [history]);

  // Authentic GitHub Contribution Colors (Light and Dark Mode)
  const getColor = (count: number) => {
    if (count === 0) return "bg-[#ebedf0] dark:bg-[#161b22]"; 
    if (count === 1) return "bg-[#9be9a8] dark:bg-[#0e4429]"; 
    if (count <= 3) return "bg-[#40c463] dark:bg-[#006d32]"; 
    if (count <= 5) return "bg-[#30a14e] dark:bg-[#26a641]"; 
    return "bg-[#216e39] dark:bg-[#39d353]"; 
  };

  return (
    <div className="mb-6 rounded-xl border border-[#d0d7de] bg-white p-4 dark:border-[#30363d] dark:bg-[#0d1117]">
      <div className="mb-4 flex items-center justify-between">
         <h3 className="text-sm font-semibold text-[#24292f] dark:text-[#e6edf3]">
           Study Activity
         </h3>
      </div>
      
      <div className="overflow-x-auto hide-scrollbar pb-2">
        <div className="flex min-w-max gap-1">
          
          {/* Days of Week Y-Axis Labels */}
          <div className="flex flex-col gap-[3px] text-[9px] text-[#656d76] dark:text-[#8b949e] pr-2 mt-[2px]">
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">Mon</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">Wed</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">Fri</span>
            <span className="h-[10px]"></span>
          </div>

          {/* The Contribution Grid */}
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
            {/* Invisible padding cells so the first actual day aligns with its proper weekday row */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="w-[10px] h-[10px] rounded-[2px] bg-transparent" />
            ))}
            
            {/* Actual day cells */}
            {days.map((day, idx) => (
              <div 
                key={idx} 
                title={`${day.count} interactions on ${day.date}`}
                className={`w-[10px] h-[10px] rounded-[2px] ${getColor(day.count)} transition-all hover:ring-1 hover:ring-black/50 dark:hover:ring-white/50 cursor-pointer`} 
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend footer */}
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-[#656d76] dark:text-[#8b949e]">
        <span className="mr-1">Less</span>
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#40c463] dark:bg-[#006d32]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]" />
        <div className="w-[10px] h-[10px] rounded-[2px] bg-[#216e39] dark:bg-[#39d353]" />
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}