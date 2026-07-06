import { BookmarksSkeleton } from "@/components/layout/SharedLayouts";

export default function Loading() {
  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-1.5 text-4xl font-extrabold tracking-tight text-foreground">
          Bookmarks
        </h1>
        <p className="text-base text-muted">
          Your saved notes, pyqs, and assignments.
        </p>
      </div>
      <BookmarksSkeleton />
    </div>
  );
}
