// frontend/src/app/~offline/page.tsx
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
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-500">
        <WifiOff size={48} />
      </div>
      <h1 className="mb-2 text-3xl font-extrabold text-gray-900 dark:text-white">You're Offline</h1>
      <p className="mb-8 max-w-md text-sm text-gray-600 dark:text-gray-400">
        It seems you've lost your internet connection. Don't worry, your cached portal and offline materials are still available.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row w-full max-w-md justify-center">
        <button
          onClick={() => window.location.reload()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#6366F1]"
        >
          <RefreshCcw size={18} />
          Retry Connection
        </button>
        
        {/* Directs user to the PDF bookmarks cached via your offline-manager */}
        <Link
          href="/bookmarks"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 dark:border-[#1F2A44] dark:bg-[#111827] dark:text-white dark:hover:bg-[#1F2A44]"
        >
          <Bookmark size={18} className="text-amber-500" />
          View Bookmarks
        </Link>
      </div>
    </div>
  );
}