"use client";

import { use, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, trackDocumentStat } from "../../../../lib/api"; 
import { useStudyHistory } from "@/app/context/StudyHistoryContext";

export default function PDFViewerPage({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string, pdfId: string }> }) {
  const { pdfId } = use(params);
  const router = useRouter();
  
  const [document, setDocument] = useState<any | null>(null);
  const { addDocumentToHistory } = useStudyHistory();

  useEffect(() => {
    const fetchPdf = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', pdfId)
        .single();
        
      if (data) {
        setDocument(data);
        
        trackDocumentStat(data.id, 'view');
        addDocumentToHistory(data);
      }
    };
    
    fetchPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId]);

  if (!document) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-[#4F46E5]" size={32} />
          <p className="text-xs font-bold text-[#64748B]">Loading Document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
      
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-[#FAFAF9] px-2 sm:px-4 dark:border-[#1F2A44] dark:bg-[#0B1020]">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#64748B] transition-colors hover:bg-[#E5E7EB] dark:hover:bg-[#1F2A44] dark:text-[#94A3B8] dark:hover:text-white"
        >
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Go Back</span><span className="sm:hidden">Back</span>
        </button>
        
        <p className="text-xs font-extrabold truncate px-4 flex-1 text-center text-[#111827] dark:text-white">
          {document.title}
        </p>
        
        <div className="w-[70px] sm:w-[90px]" /> 
      </div>

      <div className="flex-1 w-full bg-[#FAFAF9] dark:bg-black relative">
        <iframe
          src={`${document.file_url}#view=FitH`}
          className="absolute inset-0 h-full w-full border-none"
          title={document.title}
        />
      </div>
    </div>
  );
}