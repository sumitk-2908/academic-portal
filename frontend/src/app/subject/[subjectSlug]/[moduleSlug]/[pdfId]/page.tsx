"use client";

import { use, useEffect, useState, useRef } from "react";
import { 
  ArrowLeft, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Share2, Link as LinkIcon, Check, Maximize 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, trackDocumentStat, logStudySession, triggerStreakUpdate } from "../../../../lib/api"; 
import { useStudyHistory } from "@/app/context/StudyHistoryContext";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFViewerPage({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string, pdfId: string }> }) {
  const { pdfId } = use(params);
  const router = useRouter();
  
  const [documentMeta, setDocumentMeta] = useState<any | null>(null);
  const { addDocumentToHistory } = useStudyHistory();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [copied, setCopied] = useState(false);

  const hasTrackedView = useRef(false);
  const isDownloading = useRef(false);

  useEffect(() => {
    const fetchPdf = async () => {
      const { data } = await supabase.from('documents').select('*').eq('id', pdfId).single();
        
      if (data) {
        setDocumentMeta(data); 
        addDocumentToHistory({
          ...data,
          accessed_at: new Date().toISOString()
        });

        if (!hasTrackedView.current) {
          hasTrackedView.current = true; 
          await trackDocumentStat(data.id, 'view');

          const { data: sess } = await supabase.auth.getSession();
          if (sess?.session?.user?.id) {
            await logStudySession(sess.session.user.id, data.id);
            await triggerStreakUpdate(sess.session.user.id);
          }
        }
      }
    };
    fetchPdf();
  },[pdfId]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [documentMeta]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prev => Math.min(Math.max(prev + offset, 1), numPages));
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this document: ${documentMeta?.title || 'Academic Resource'}\n\n`);
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, "_blank");
  };

  // ROBUST DOWNLOAD HANDLER: Forces asynchronous tracking completion
  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    
    // If it's already downloading (user double-clicked), ignore the click
    if (isDownloading.current || !documentMeta) return; 
    
    isDownloading.current = true; // Lock the button

    try {
      await trackDocumentStat(documentMeta.id, 'download');
      
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user?.id) {
        await logStudySession(sess.session.user.id, documentMeta.id);
        await triggerStreakUpdate(sess.session.user.id);
      }
    } catch (error) {
      console.error("Tracking failed:", error);
    } finally {
      // Open the PDF
      window.open(documentMeta.file_url, '_blank');
      
      // Unlock the button after 2 seconds in case they want to download it again later
      setTimeout(() => {
        isDownloading.current = false;
      }, 2000);
    }
  };

  if (!documentMeta) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-[#4F46E5]" size={32} />
          <p className="text-xs font-bold text-[#64748B]">Fetching Document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-[#FAFAF9] px-2 sm:px-4 dark:border-[#1F2A44] dark:bg-[#0B1020]">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#64748B] transition-colors hover:bg-[#E5E7EB] dark:hover:bg-[#1F2A44] dark:text-[#94A3B8] dark:hover:text-white">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Go Back</span><span className="sm:hidden">Back</span>
        </button>
        
        <p className="text-xs font-extrabold truncate px-4 flex-1 text-center text-[#111827] dark:text-white">
          {documentMeta.title}
        </p>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800">
                <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 dark:border-[#1F2A44] dark:bg-[#111827]" align="end" sideOffset={5}>
                <DropdownMenu.Item onClick={handleCopyLink} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-gray-700 outline-none hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                  {copied ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={handleWhatsAppShare} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-green-600 outline-none hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  WhatsApp
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <a 
            href={documentMeta.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={handleDownloadClick}
            className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#4F46E5] transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
          >
             <span className="hidden sm:inline">FullScreen</span> <Maximize size={14} />
          </a>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-2 dark:border-[#1F2A44] dark:bg-[#111827]">
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.6))} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><ZoomOut size={18} /></button>
          <span className="w-10 text-center text-xs font-bold text-gray-700 dark:text-gray-300">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><ZoomIn size={18} /></button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="flex items-center justify-center rounded-lg bg-gray-100 p-1.5 text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"><ChevronLeft size={18} /></button>
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">Page {pageNumber} of {numPages || '--'}</span>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="flex items-center justify-center rounded-lg bg-gray-100 p-1.5 text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-[#FAFAF9] p-4 flex justify-center dark:bg-black custom-scrollbar">
        <Document file={documentMeta.file_url} onLoadSuccess={onDocumentLoadSuccess} loading={<Loader2 className="mt-10 animate-spin text-[#4F46E5]" size={32} />} error={<p className="mt-10 text-xs text-red-500">Failed to load PDF. Please ensure CORS is configured in Supabase.</p>}>
          {containerWidth > 0 && (
            <div className="shadow-lg mb-4 ring-1 ring-gray-900/5">
              <Page pageNumber={pageNumber} scale={scale} width={containerWidth * 0.95} renderTextLayer={true} renderAnnotationLayer={true} loading={<div className="h-[500px] w-full animate-pulse bg-white dark:bg-gray-900" />} />
            </div>
          )}
        </Document>
      </div>
    </div>
  );
}