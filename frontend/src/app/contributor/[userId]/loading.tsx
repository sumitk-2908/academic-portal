import { DocumentGridSkeleton } from "@/components/layout/SharedLayouts";

export default function ContributorLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-10 flex flex-col items-center justify-center gap-4 text-center">
        <div className="h-20 w-20 rounded-full bg-border animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="mx-auto h-8 w-48 rounded-md bg-border animate-pulse" />
          <div className="mx-auto h-4 w-32 rounded-md bg-border animate-pulse" />
        </div>
        
        {/* Stats Row Skeleton */}
        <div className="mt-4 flex gap-4">
          <div className="h-16 w-24 rounded-xl bg-border animate-pulse" />
          <div className="h-16 w-24 rounded-xl bg-border animate-pulse" />
          <div className="h-16 w-24 rounded-xl bg-border animate-pulse" />
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-32 rounded-md bg-border animate-pulse" />
      </div>

      <DocumentGridSkeleton count={8} />
    </div>
  );
}
