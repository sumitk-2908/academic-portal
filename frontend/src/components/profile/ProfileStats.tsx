export default function ProfileStats({
  stats,
}: {
  stats: {
    subjects: number;
    bookmarks: number;
    uploads: number;
    downloads?: number;
  };
}) {
  const displayStats = [
    { label: "Subjects", value: stats.subjects.toString() },
    { label: "Bookmarks", value: stats.bookmarks.toString() },
    { label: "Contributions", value: stats.uploads.toString() },
    // FIX: Replaced the hardcoded "—" with the live download value
    {
      label: "Downloads",
      value: stats.downloads !== undefined ? stats.downloads.toString() : "0",
    },
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
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}