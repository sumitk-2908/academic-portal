"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// The dynamic import with ssr: false is perfectly valid inside a Client Component
const PDFViewerClient = dynamic(() => import('./PDFViewerClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] w-full items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="animate-spin text-[#4F46E5]" size={32} />
        <p className="text-xs font-bold text-[#64748B]">Initializing Document Viewer...</p>
      </div>
    </div>
  )
});

export default function PDFViewerWrapper({ documentMeta }: { documentMeta: any }) {
  return <PDFViewerClient documentMeta={documentMeta} />;
}