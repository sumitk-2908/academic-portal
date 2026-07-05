"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-4 text-destructive" size={40} />
          <h1 className="text-2xl font-extrabold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">The portal hit a critical error. Your work is safe.</p>
          <button
            onClick={reset}
            className="motion-hover motion-active mt-6 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Reload Portal
          </button>
        </div>
      </body>
    </html>
  );
}
