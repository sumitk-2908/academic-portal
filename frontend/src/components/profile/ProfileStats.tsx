export default function ProfileStats({
  stats,
}: {
  stats: {
    streak: number;
    contributions: number;
    approved: number;
    revisions: number;
  };
}) {
  const displayStats = [
    { label: "Day Streak", value: stats.streak.toString() },
    { label: "Total Uploads", value: stats.contributions.toString() },
    { label: "Approved Notes", value: stats.approved.toString() },
    { label: "Revisions Made", value: stats.revisions.toString() },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {displayStats.map((stat, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-border bg-surface p-4 text-center"
        >
          <div className="text-2xl font-extrabold text-foreground">
            {stat.value}
          </div>
          <div className="mt-1 text-xs font-bold tracking-wider text-muted uppercase">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}