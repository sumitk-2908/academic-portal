"use client";

import { WifiOff, Bookmark, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function OfflineFallbackPage() {
  // Automatically reload the page once network returns
  useEffect(() => {
    const handleOnline = () => window.location.reload();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4 animate-fade-up">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <WifiOff size={48} />
      </div>

      <h1 className="mb-1.5 text-4xl font-extrabold tracking-tight text-foreground">
        You're Offline
      </h1>

      <p className="mb-8 max-w-md text-base text-muted">
        It seems you've lost your internet connection. Don't worry, your cached portal and offline materials are still available.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row w-full max-w-md justify-center">
        <button
          onClick={() => window.location.reload()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90"
        >
          <RefreshCcw size={18} />
          Retry Connection
        </button>

        {/* Directs user to the PDF bookmarks cached via your offline-manager */}
        <Link
          href="/bookmarks"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-foreground motion-hover motion-active hover:bg-surface-hover"
        >
          <Bookmark size={18} className="text-warning" />
          View Bookmarks
        </Link>
      </div>
    </div>
  );
}