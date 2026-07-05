"use client";

import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      title="An error occurred"
      message="The page ran into a problem. Please try reloading."
      onReset={reset}
    >
      <div className="hidden">{error.message}</div>
    </ErrorBoundary>
  );
}
