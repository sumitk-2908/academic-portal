import { CenteredSpinner } from "@/components/layout/SharedLayouts";

export default function Loading() {
  return (
    <div className="animate-fade-up mx-auto w-full max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1.5 text-4xl font-extrabold tracking-tight text-foreground">
            Portal Admin
          </h1>
          <p className="text-base text-muted">
            Manage uploads and flags
          </p>
        </div>
      </div>
      <CenteredSpinner />
    </div>
  );
}
