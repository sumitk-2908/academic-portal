"use client";

import { useEffect, useState, useRef } from "react";
import { 
  ArrowLeft, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Share2, Link as LinkIcon, Check, Maximize,
  ThumbsUp, ThumbsDown, Flag, X 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, trackDocumentStat, logStudySession, triggerStreakUpdate } from "@/app/lib/api"; 
import { useStudyHistory } from "@/app/context/StudyHistoryContext";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import * as Toast from "@radix-ui/react-toast";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PDFViewerClient({ documentMeta }: { documentMeta: any }) {
  const router = useRouter();
  const { addDocumentToHistory } = useStudyHistory();

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [copied, setCopied] = useState(false);
  const hasTrackedView = useRef(false);
  const isDownloading = useRef(false);

  const [toast, setToast] = useState({ open: false, title: "", message: "", type: "error" });

  const showToast = (title: string, message: string, type: "error" | "success") => {
    setToast({ open: true, title, message, type });
  };

  const [userRating, setUserRating] = useState<boolean | null>(null);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('incorrect');
  const [flagDescription, setFlagDescription] = useState('');
  const [isSubmittingQuality, setIsSubmittingQuality] = useState(false);

  useEffect(() => {
    const trackAnalytics = async () => {
      if (!hasTrackedView.current && documentMeta) {
        hasTrackedView.current = true; 
        
        // Track the view locally to prevent bot inflation on the server
        await trackDocumentStat(documentMeta.id, 'view');

        const { data: sess } = await supabase.auth.getSession();
        if (sess?.session?.user?.id) {
          await logStudySession(sess.session.user.id, documentMeta.id);
          await triggerStreakUpdate(sess.session.user.id);
        }

        addDocumentToHistory({
          ...documentMeta,
          accessed_at: new Date().toISOString()
        });
      }
    };
    trackAnalytics();
  }, [documentMeta, addDocumentToHistory]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

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
    const text = encodeURIComponent(`Check out this document: ${documentMeta.title}\n\n`);
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, "_blank");
  };

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    if (isDownloading.current) return; 
    
    isDownloading.current = true;

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
      window.open(documentMeta.file_url, '_blank');
      setTimeout(() => { isDownloading.current = false; }, 2000);
    }
  };

  const handleRateDocument = async (isUseful: boolean) => {
    setUserRating(isUseful);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user?.id) return showToast("Action Required", "Please log in to rate.", "error");

      const { error } = await supabase
        .from('document_ratings')
        .upsert(
          { document_id: documentMeta.id, user_id: sess.session.user.id, is_useful: isUseful },
          { onConflict: 'document_id,user_id' } 
        );
      if (error) throw error;
    } catch (error) {
      setUserRating(null);
    }
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingQuality(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session?.user?.id) return showToast("Action Required", "Please log in to flag content.", "error");

      const { error } = await supabase.from('document_flags').insert({
          document_id: documentMeta.id,
          user_id: sess.session.user.id,
          reason: flagReason,
          description: flagDescription
      });

      if (error && error.code === '23505') {
        showToast("Notice", "You have already flagged this document.", "error");
      } else if (error) throw error;
      else {
        showToast("Report Submitted", "Thank you! Your report has been sent.", "success");
        setIsFlagModalOpen(false);
        setFlagDescription('');
      }
    } catch (error) {
      showToast("Submission Failed", "Something went wrong. Please try again.", "error");
    } finally {
      setIsSubmittingQuality(false);
    }
  };

  return (
   <Toast.Provider swipeDirection="right">
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-[#FAFAF9] px-2 sm:px-4 dark:border-[#1F2A44] dark:bg-[#0B1020]">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#64748B] transition-colors hover:bg-[#E5E7EB] dark:hover:bg-[#1F2A44] dark:text-[#94A3B8] dark:hover:text-white">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Go Back</span><span className="sm:hidden">Back</span>
        </button>
        
        <div className="flex-1 flex flex-col items-center justify-center truncate px-4">
          <p className="text-xs font-extrabold truncate w-full text-center text-[#111827] dark:text-white">
            {documentMeta.title}
          </p>
          <p className="text-[10px] font-semibold text-indigo-500 truncate w-full text-center">
            Uploaded by {documentMeta.uploader_name || 'Anonymous'}
          </p>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-gray-700 pr-3">
            <button onClick={() => handleRateDocument(true)} className={`p-1.5 rounded-lg transition-colors ${userRating === true ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
              <ThumbsUp size={16} className={userRating === true ? 'fill-current' : ''} />
            </button>
            <button onClick={() => handleRateDocument(false)} className={`p-1.5 rounded-lg transition-colors ${userRating === false ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}>
              <ThumbsDown size={16} className={userRating === false ? 'fill-current' : ''} />
            </button>
          </div>

          <button onClick={() => setIsFlagModalOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 mr-1">
            <Flag size={16} />
          </button> 

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

          <a href={documentMeta.file_url} target="_blank" rel="noopener noreferrer" onClick={handleDownloadClick} className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#4F46E5] transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
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

      {isFlagModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Flag size={16} className="text-red-500" /> Report Issue
              </h3>
              <button onClick={() => setIsFlagModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitFlag} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Issue Type</label>
                <select value={flagReason} onChange={(e) => setFlagReason(e.target.value)} className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2A44] px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F46E5] outline-none">
                  <option value="incorrect">Incorrect/Outdated Content</option>
                  <option value="duplicate">Duplicate Document</option>
                  <option value="low_quality">Poor Quality / Unreadable</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Additional Details (Optional)</label>
                <textarea value={flagDescription} onChange={(e) => setFlagDescription(e.target.value)} className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1F2A44] px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F46E5] outline-none min-h-[80px] resize-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsFlagModalOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmittingQuality} className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2">
                  {isSubmittingQuality ? <Loader2 size={14} className="animate-spin" /> : null} Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      <Toast.Root open={toast.open} onOpenChange={(open) => setToast(prev => ({...prev, open}))} className={`fixed z-[150] bottom-4 right-4 w-auto max-w-md rounded-xl p-4 shadow-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${toast.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50' : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50'}`}>
        <Toast.Title className={`text-sm font-bold ${toast.type === 'error' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>{toast.title}</Toast.Title>
        <Toast.Description className={`mt-1 text-xs ${toast.type === 'error' ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>{toast.message}</Toast.Description>
      </Toast.Root>
     <Toast.Viewport className="fixed bottom-0 right-0 z-[150] p-6 w-full md:max-w-[400px] outline-none flex flex-col gap-2" />
    </Toast.Provider>
  );
}