import { DocumentGridSkeleton } from "@/components/layout/SharedLayouts";

export default function Loading() {
  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl">
      <div className="mb-8">
        <h1 className="mb-1.5 text-4xl font-extrabold tracking-tight text-foreground">
          Recently Uploaded
        </h1>
        <p className="text-base text-muted">
          The newest resources shared by the community.
        </p>
      </div>
      <DocumentGridSkeleton count={10} />
    </div>
  );
}
