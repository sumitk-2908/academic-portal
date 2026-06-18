"use client";

import { use, useEffect, useState, useRef } from "react";
import { ArrowLeft, Loader2, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, trackDocumentStat } from "../../../../lib/api"; 
import { useStudyHistory } from "@/app/context/StudyHistoryContext";

// --- React-PDF Imports ---
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize the PDF.js worker securely using the unpkg CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFViewerPage({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string, pdfId: string }> }) {
  const { pdfId } = use(params);
  const router = useRouter();
  
  const [documentMeta, setDocumentMeta] = useState<any | null>(null);
  const { addDocumentToHistory } = useStudyHistory();

  // PDF.js States
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', pdfId)
        .single();
        
      if (data) {
        setDocumentMeta(data);
        trackDocumentStat(data.id, 'view');
        addDocumentToHistory(data);
      }
    };
    
    fetchPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId]);

  // Handle responsive width for mobile screens
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    // Initial width check
    updateWidth();
    // Listen for screen rotation or resizing
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [documentMeta]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(newPage, 1), numPages);
    });
  }

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
      
      {/* 1. Header Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-[#FAFAF9] px-2 sm:px-4 dark:border-[#1F2A44] dark:bg-[#0B1020]">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#64748B] transition-colors hover:bg-[#E5E7EB] dark:hover:bg-[#1F2A44] dark:text-[#94A3B8] dark:hover:text-white"
        >
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Go Back</span><span className="sm:hidden">Back</span>
        </button>
        
        <p className="text-xs font-extrabold truncate px-4 flex-1 text-center text-[#111827] dark:text-white">
          {documentMeta.title}
        </p>
        
        <a 
          href={documentMeta.file_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#4F46E5] transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
        >
           <span className="hidden sm:inline">Open Native</span> <ExternalLink size={14} />
        </a>
      </div>

      {/* 2. Controls Toolbar */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-2 dark:border-[#1F2A44] dark:bg-[#111827]">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setScale(s => Math.max(s - 0.2, 0.6))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ZoomOut size={18} />
          </button>
          <span className="w-10 text-center text-xs font-bold text-gray-700 dark:text-gray-300">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={() => setScale(s => Math.min(s + 0.2, 2.5))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
            className="flex items-center justify-center rounded-lg bg-gray-100 p-1.5 text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">
            Page {pageNumber} of {numPages || '--'}
          </span>
          <button 
            onClick={() => changePage(1)} 
            disabled={pageNumber >= numPages}
            className="flex items-center justify-center rounded-lg bg-gray-100 p-1.5 text-gray-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 3. The Interactive Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#FAFAF9] p-4 flex justify-center dark:bg-black custom-scrollbar"
      >
        <Document
          file={documentMeta.file_url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<Loader2 className="mt-10 animate-spin text-[#4F46E5]" size={32} />}
          error={<p className="mt-10 text-xs text-red-500">Failed to load PDF. Please ensure CORS is configured in Supabase.</p>}
        >
          {containerWidth > 0 && (
            <div className="shadow-lg mb-4 ring-1 ring-gray-900/5">
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                width={containerWidth * 0.95} // Leaves a tiny margin on mobile
                renderTextLayer={true}        // Allows highlighting and copying text!
                renderAnnotationLayer={true}  // Renders clickable links inside the PDF
                loading={<div className="h-[500px] w-full animate-pulse bg-white dark:bg-gray-900" />}
              />
            </div>
          )}
        </Document>
      </div>
    </div>
  );
}