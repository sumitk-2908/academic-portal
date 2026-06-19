export default function ProfileStats() {
  const stats = [
    { label: "Subjects", value: "7" },
    { label: "Bookmarks", value: "12" },
    { label: "Uploads", value: "5" },
    { label: "Downloads", value: "214" },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-center dark:border-[#1F2A44] dark:bg-[#131625]">
          <div className="text-2xl font-extrabold text-gray-900 dark:text-white">{stat.value}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}