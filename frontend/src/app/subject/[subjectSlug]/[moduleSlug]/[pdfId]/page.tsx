"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/api"; 

export default function FullscreenPDFViewer({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string, pdfId: string }> }) {
  // UNWRAP THE PARAMS PROMISE
  const { subjectSlug, moduleSlug, pdfId } = use(params);
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      const { data } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', pdfId)
        .single();
        
      if (data) setPdfUrl(data.file_url);
    };
    
    fetchPdf();
  }, [pdfId]);

  if (!pdfUrl) return <div className="flex h-screen items-center justify-center bg-black text-white">Loading Document...</div>;

  return (
    <div className="flex h-screen w-screen flex-col bg-black overflow-hidden">
      <div className="flex h-14 shrink-0 items-center border-b border-gray-800 bg-gray-950 px-4">
        <Link 
          href={`/subject/${subjectSlug}/${moduleSlug}`}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to {moduleSlug.replace('-', ' ').toUpperCase()}
        </Link>
      </div>

      <div className="flex-1 w-full bg-gray-900">
        <iframe
          src={`${pdfUrl}#view=FitH`}
          className="h-full w-full border-none"
          title="PDF Viewer"
        />
      </div>
    </div>
  );
}