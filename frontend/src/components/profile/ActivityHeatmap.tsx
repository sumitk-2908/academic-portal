"use client";
import { useMemo } from "react";

export default function ActivityHeatmap({ history }: { history: any[] }) {
  const { days, startPadding, monthLabels, currentYear } = useMemo(() => {
    const activityMap: Record<string, number> = {};
    history.forEach(item => {
      const dateStr = new Date(item.accessed_at || item.created_at).toISOString().split("T")[0];
      activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
    });

    // 1. Lock to the current calendar year
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1); // January 1st
    const endDate = new Date(currentYear, 11, 31); // December 31st

    const totalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 2. Generate exactly 365 (or 366 for leap years) days
    const dates = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      dates.push({
        date: dateStr,
        count: activityMap[dateStr] || 0,
        jsDate: d,
      });
    }

    const padding = dates.length > 0 ? dates[0].jsDate.getDay() : 0;

    // 3. Generate Month Labels (Jan, Feb, Mar...)
    const labels = [];
    let currentMonth = -1;
    const totalCells = padding + dates.length;
    const totalCols = Math.ceil(totalCells / 7);

    for (let col = 0; col < totalCols; col++) {
      let firstValidDay = null;
      for (let row = 0; row < 7; row++) {
        const cellIndex = col * 7 + row;
        const dayIndex = cellIndex - padding;
        if (dayIndex >= 0 && dayIndex < dates.length) {
          firstValidDay = dates[dayIndex].jsDate;
          break;
        }
      }

      if (firstValidDay) {
        const month = firstValidDay.getMonth();
        if (month !== currentMonth) {
          labels.push({
            label: firstValidDay.toLocaleString("default", { month: "short" }),
            colIndex: col,
          });
          currentMonth = month;
        }
      }
    }

    return { days: dates, startPadding: padding, monthLabels: labels, currentYear };
  }, [history]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-[#ebedf0] dark:bg-[#161b22]";
    if (count === 1) return "bg-[#9be9a8] dark:bg-[#0e4429]";
    if (count <= 3) return "bg-[#40c463] dark:bg-[#006d32]";
    if (count <= 5) return "bg-[#30a14e] dark:bg-[#26a641]";
    return "bg-[#216e39] dark:bg-[#39d353]";
  };

  return (
    <div className="mb-6 rounded-xl border bg-surface border-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#24292f] dark:text-[#e6edf3]">
          {/* Added the dynamic year to the title so users know what year they are looking at */}
          Study Activity ({currentYear})
        </h3>
      </div>

      <div className="overflow-x-auto hide-scrollbar pb-2">
        <div className="flex min-w-max gap-1">
          <div className="mt-[15px] flex flex-col gap-[3px] pr-2 text-xs text-[#656d76] dark:text-[#8b949e]">
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">Mon</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">Wed</span>
            <span className="h-[10px]"></span>
            <span className="h-[10px] leading-[10px]">Fri</span>
            <span className="h-[10px]"></span>
          </div>

          <div className="flex flex-col gap-[2px]">
            <div className="relative h-[13px] w-full">
              {monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute text-xs text-[#24292f] dark:text-[#e6edf3]"
                  style={{ left: m.colIndex * 13 }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
              {Array.from({ length: startPadding }).map((_, i) => (
                <div
                  key={`pad-${i}`}
                  className="h-[10px] w-[10px] rounded-[2px] bg-transparent"
                />
              ))}

              {days.map((day, idx) => (
                <div
                  key={idx}
                  title={`${day.count} interactions on ${day.date}`}
                  className={`h-[10px] w-[10px] rounded-[2px] ${getColor(day.count)} cursor-pointer transition-all hover:ring-1 hover:ring-black/50 dark:hover:ring-white/50`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1 text-xs text-[#656d76] dark:text-[#8b949e]">
        <span className="mr-1">Less</span>
        <div className="h-[10px] w-[10px] rounded-[2px] bg-[#ebedf0] dark:bg-[#161b22]" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-[#40c463] dark:bg-[#006d32]" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-[#216e39] dark:bg-[#39d353]" />
        <span className="ml-1">More</span>
      </div>
    </div>
  );
}