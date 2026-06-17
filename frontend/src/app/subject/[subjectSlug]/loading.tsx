export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 animate-pulse p-4 md:p-6 lg:p-8">
      <div className="h-28 w-full rounded-3xl bg-gray-100 dark:bg-gray-800/50" />
      <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-800/50" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 w-full rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}