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
import { InlineSpinner } from "@/components/layout/SharedLayouts";

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
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      
      {/* 1. Header: w-full ensures it takes full width for flex distributions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border bg-surface-hover p-3 sm:px-4 sm:py-2 min-h-[3.5rem] shrink-0 w-full">
        
        <button onClick={() => router.back()} className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 text-sm font-bold text-muted motion-hover motion-active hover:bg-surface-hover shrink-0">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Go Back</span><span className="sm:hidden">Back</span>
        </button>
        
       {/* 2. Text Container: items-center and text-center applied universally */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-w-0 px-1 sm:px-4">
          <h1 className="text-base sm:text-sm font-extrabold text-foreground break-words whitespace-normal w-full text-center leading-tight">
            {documentMeta.title}
          </h1>
          <p className="text-sm font-semibold text-primary break-words whitespace-normal w-full text-center mt-1 leading-tight">
            Uploaded by {documentMeta.uploader_name || 'Anonymous'}
          </p>
        </div>
        
        {/* 3. Action Icons: Labels added for Report and Share to fill space evenly */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-1 sm:gap-2 shrink-0 mt-2 sm:mt-0 text-muted">
          
          <div className="flex items-center gap-1 sm:mr-2 border-r border-border pr-2 sm:pr-3 shrink-0">
            <button onClick={() => handleRateDocument(true)} className={`p-1.5 rounded-lg motion-hover motion-active ${userRating === true ? 'bg-success/10 text-success' : 'text-muted hover:bg-surface-hover'}`}>
              <ThumbsUp size={16} className={userRating === true ? 'fill-current' : ''} />
            </button>
            <button onClick={() => handleRateDocument(false)} className={`p-1.5 rounded-lg motion-hover motion-active ${userRating === false ? 'bg-destructive/10 text-destructive' : 'text-muted hover:bg-surface-hover'}`}>
              <ThumbsDown size={16} className={userRating === false ? 'fill-current' : ''} />
            </button>
          </div>

          <button onClick={() => setIsFlagModalOpen(true)} className="flex items-center gap-1.5 p-1.5 rounded-lg text-muted hover:bg-destructive/10 hover:text-destructive motion-hover motion-active sm:mr-1 shrink-0">
            <Flag size={16} /> <span className="text-sm font-bold">Report</span>
          </button> 

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-sm font-bold text-foreground motion-hover motion-active hover:bg-surface-hover shrink-0">
                <Share2 size={14} /> <span className="text-sm font-bold">Share</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg animate-in fade-in zoom-in-95 motion-dropdown" align="end" sideOffset={5}>
                <DropdownMenu.Item onClick={handleCopyLink} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground outline-none motion-hover hover:bg-surface-hover">
                  {copied ? <Check size={14} className="text-success" /> : <LinkIcon size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={handleWhatsAppShare} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-success outline-none motion-hover hover:bg-success/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1  8 8v.5z"/></svg>
                  WhatsApp
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <a href={documentMeta.file_url} target="_blank" rel="noopener noreferrer" onClick={handleDownloadClick} className="flex items-center gap-1.5 rounded-xl px-2 sm:px-3 py-1.5 text-sm font-bold text-primary motion-hover motion-active hover:bg-primary/10 shrink-0">
             <span className="hidden sm:inline">FullScreen</span> <Maximize size={14} />
          </a>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setScale(s => Math.max(s - 0.2, 0.6))} className="rounded-lg p-1.5 text-muted motion-hover motion-active hover:bg-surface-hover"><ZoomOut size={18} /></button>
          <span className="w-10 text-center text-sm font-bold tabular-nums text-foreground">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(s + 0.2, 2.5))} className="rounded-lg p-1.5 text-muted motion-hover motion-active hover:bg-surface-hover"><ZoomIn size={18} /></button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="flex items-center justify-center rounded-lg bg-surface-hover p-1.5 text-foreground disabled:opacity-50 motion-hover motion-active"><ChevronLeft size={18} /></button>
          <span className="text-sm font-bold tabular-nums text-muted">Page {pageNumber} of {numPages || '--'}</span>
          <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="flex items-center justify-center rounded-lg bg-surface-hover p-1.5 text-foreground disabled:opacity-50 motion-hover motion-active"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-surface-hover p-4 flex justify-center custom-scrollbar">
        <Document file={documentMeta.file_url} onLoadSuccess={onDocumentLoadSuccess} loading={<Loader2 className="mt-10 animate-spin text-primary" size={32} />} error={<p className="mt-10 text-xs text-destructive">Failed to load PDF. Please ensure CORS is configured in Supabase.</p>}>
          {containerWidth > 0 && (
            <div className="shadow-lg mb-4 ring-1 ring-foreground/5">
              <Page pageNumber={pageNumber} scale={scale} width={containerWidth * 0.95} renderTextLayer={true} renderAnnotationLayer={true} loading={<div className="h-[500px] w-full animate-pulse bg-surface" />} />
            </div>
          )}
        </Document>
      </div>

      {isFlagModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 motion-modal">
          <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 motion-modal">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Flag size={16} className="text-destructive" /> Report Issue
              </h3>
              <button onClick={() => setIsFlagModalOpen(false)} className="text-muted hover:text-foreground motion-hover">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitFlag} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-1">Issue Type</label>
                <select value={flagReason} onChange={(e) => setFlagReason(e.target.value)} className="w-full text-base rounded-xl border border-border bg-background px-3 py-2 text-foreground motion-focus focus:border-primary outline-none">
                  <option value="incorrect" className="bg-surface">Incorrect/Outdated Content</option>
                  <option value="duplicate" className="bg-surface">Duplicate Document</option>
                  <option value="low_quality" className="bg-surface">Poor Quality / Unreadable</option>
                  <option value="other" className="bg-surface">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-1">Additional Details (Optional)</label>
                <textarea value={flagDescription} onChange={(e) => setFlagDescription(e.target.value)} className="w-full text-base rounded-xl border border-border bg-background px-3 py-2 text-foreground motion-focus focus:border-primary outline-none min-h-[80px] resize-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsFlagModalOpen(false)} className="px-4 py-2 text-xs font-bold text-foreground bg-surface-hover rounded-xl motion-hover motion-active">Cancel</button>
                <button type="submit" disabled={isSubmittingQuality} className="px-4 py-2 text-xs font-bold text-white bg-destructive hover:opacity-90 disabled:opacity-50 rounded-xl motion-hover motion-active flex items-center gap-2">
                  {isSubmittingQuality ? <InlineSpinner label="Submitting report" size={14} /> : null} Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
      <Toast.Root open={toast.open} onOpenChange={(open) => setToast(prev => ({...prev, open}))} className={`fixed z-[150] bottom-4 right-4 w-auto max-w-md rounded-xl p-4 shadow-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${toast.type === 'error' ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20'}`}>
        <Toast.Title className={`text-sm font-bold ${toast.type === 'error' ? 'text-destructive' : 'text-success'}`}>{toast.title}</Toast.Title>
        <Toast.Description className={`mt-1 text-xs ${toast.type === 'error' ? 'text-destructive/80' : 'text-success/80'}`}>{toast.message}</Toast.Description>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-0 right-0 z-[150] p-6 w-full md:max-w-[400px] outline-none flex flex-col gap-2" />
    </Toast.Provider>
  );
}
