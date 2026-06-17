export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse pt-8 px-4 md:px-6 lg:px-8">
      <div className="mb-10 flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-3/4 max-w-md rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-1/2 rounded-full bg-gray-100 dark:bg-gray-800/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="h-32 w-full rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
        ))}
      </div>
    </div>
  );
}