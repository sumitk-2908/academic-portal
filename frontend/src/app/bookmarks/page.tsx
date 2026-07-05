"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, getStudentBookmarks, trackDocumentStat } from "../lib/api";
import { withOptimisticUpdate } from "../lib/optimistic";
import { dispatchToast } from "../lib/toast";
import { Bookmark, Download, Eye, FileText, NotebookPen, FileQuestion, ListChecks, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { manageOfflinePdf } from "../lib/offline-manager";
import { requestAuthPrompt } from "../lib/auth-prompts";
import { requestUploadPrompt, shouldShowContributionPrompt, dismissContributionPrompt } from "../lib/student-prompts";
import { BookmarksSkeleton, InlineSpinner } from "@/components/layout/SharedLayouts";
import type { DocumentRecord } from "@/app/lib/document-types";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const CATEGORY_ICONS: Record<string, LucideIcon> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

function BookmarksContent() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [showContributionPrompt, setShowContributionPrompt] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);
  const downloadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const fetchBookmarks = async (silent = false) => {
      if (!silent) setLoading(true); 
      
      const { data: sess } = await supabase.auth.getSession();
      const currentUserId = sess?.session?.user?.id;
      
      if (!currentUserId) {
        if (isMounted) {
          setUserId("");
          setDocuments([]);
          setIsSignedOut(true);
          if (!silent) setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setIsSignedOut(false);
        setUserId(currentUserId);
        
      }

      const userBookmarks = await getStudentBookmarks(currentUserId);
      if (isMounted) {
        setDocuments(userBookmarks);
        setShowContributionPrompt(shouldShowContributionPrompt(userBookmarks.length));
        if (!silent) setLoading(false);
      }
    };

    // Initial fetch
    fetchBookmarks();

    const handleUpdate = () => fetchBookmarks(true);

    window.addEventListener("sidebar_update", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("sidebar_update", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const toggleBookmark = async (id: number) => {
    const docToRemove = documents.find(d => d.id === id);
    const snapshotDocuments = [...documents];
    const snapshotLocalStorage = localStorage.getItem("portal_bookmarks");

    const applyOptimistic = () => {
      const nextDocs = documents.filter(d => d.id !== id);
      setDocuments(nextDocs);
      setShowContributionPrompt(shouldShowContributionPrompt(nextDocs.length));
      const nextIds = nextDocs.map(d => d.id);
      localStorage.setItem("portal_bookmarks", JSON.stringify(nextIds));
      window.dispatchEvent(new Event("sidebar_update"));
    };

    const revertOptimistic = () => {
      setDocuments(snapshotDocuments);
      setShowContributionPrompt(shouldShowContributionPrompt(snapshotDocuments.length));
      if (snapshotLocalStorage) {
        localStorage.setItem("portal_bookmarks", snapshotLocalStorage);
      } else {
        localStorage.removeItem("portal_bookmarks");
      }
      window.dispatchEvent(new Event("sidebar_update"));
      dispatchToast("Error", "Failed to remove bookmark", "error");
    };

    const serverMutation = async () => {
      if (docToRemove?.file_url) {
        manageOfflinePdf(docToRemove.file_url, 'REMOVE_PDF').catch(console.error);
      }
      if (userId) {
        const { error } = await supabase.from('student_bookmarks').delete().match({ user_id: userId, document_id: id });
        if (error) throw error;
      }
    };

    await withOptimisticUpdate(
      applyOptimistic,
      null, // not using current state in apply function directly
      serverMutation,
      revertOptimistic
    );
  };

  const handleDownload = async (e: React.MouseEvent, doc: DocumentRecord) => {
    e.preventDefault();
    
    if (downloadingRef.current.has(doc.id)) return;
    downloadingRef.current.add(doc.id);
    setDownloadingIds((prev) => [...prev, doc.id]);

    try {
      await trackDocumentStat(doc.id, 'download');
      const link = document.createElement("a");
      link.href = `${doc.file_url}?download=${encodeURIComponent(doc.title)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => {
        downloadingRef.current.delete(doc.id);
        setDownloadingIds((prev) => prev.filter((id) => id !== doc.id));
      }, 2000);
    }
  };

  if (loading) return <BookmarksSkeleton />;

  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center gap-4 rounded-3xl border border-warning/20 bg-warning/5 p-6 shadow-sm">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-warning text-primary-foreground">
          <Bookmark size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Bookmarks</h1>
          <p className="mt-1 text-sm font-semibold tracking-wider text-warning">Your saved PDFs and study materials</p>
        </div>
      </div>

      {showContributionPrompt && !isSignedOut && (
        <div className="flex flex-col gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-tight text-foreground">Help others build their study library too.</p>
            <p className="mt-1 text-sm leading-6 font-medium text-muted">Your bookmarks are useful. Upload notes that made a subject click for you.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={requestUploadPrompt} className="motion-hover motion-active rounded-xl bg-warning px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              Upload Notes
            </button>
            <button
              onClick={() => {
                dismissContributionPrompt();
                setShowContributionPrompt(false);
              }}
              className="motion-hover motion-active rounded-xl px-3 py-2 text-sm font-bold text-muted hover:bg-surface-hover"
            >
              Later
            </button>
          </div>
        </div>
      )}

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isSignedOut ? (
          <div className="col-span-full rounded-2xl border border-dashed border-warning/30 bg-warning/5 p-8 text-center">
            <p className="mx-auto max-w-md text-sm leading-6 font-medium text-muted">
              Sign in to sync your bookmarks and continue studying across all your devices.
            </p>
            <button onClick={() => requestAuthPrompt("bookmark")} className="motion-hover motion-active mt-4 rounded-xl bg-warning px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              Save Bookmarks
            </button>
          </div>
        ) : documents.map(doc => {
          const Icon = CATEGORY_ICONS[doc.category] || FileText;
          return (
            <article key={doc.id} className="group motion-hover flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm hover:-translate-y-0.5 hover:border-warning">
              <div className="flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-xl bg-warning/10 text-warning"><Icon size={16} /></div>
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold tracking-[0.06em] text-muted uppercase">{doc.subject}</span>
              </div>
              <h3 className="mt-3 line-clamp-2 min-h-[2rem] text-sm font-bold tracking-tight text-foreground">{doc.title}</h3>
              <div className="mt-4 flex gap-2 border-t border-border pt-3">
                <button onClick={(e) => handleDownload(e, doc)} className="motion-hover motion-active inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2 text-sm font-bold text-foreground hover:bg-surface-hover">
                  {downloadingIds.includes(doc.id) ? <InlineSpinner label="Downloading" size={12} /> : <Download size={12} />} Download
                </button>
                <Link href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} className="motion-hover motion-active inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-warning py-2 text-sm font-bold text-white hover:opacity-90">
                  <Eye size={12} /> View
                </Link>
                <button onClick={() => toggleBookmark(doc.id)} className="motion-hover motion-active shrink-0 rounded-xl border border-warning/30 bg-warning/10 p-2 text-warning">
                  <Bookmark size={14} className="fill-warning" />
                </button>
              </div>
            </article>
          );
        })}
        {documents.length === 0 && !isSignedOut && (
          <div className="col-span-full rounded-2xl border border-dashed border-warning/30 bg-warning/5 p-8 text-center">
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">Build your study library</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 font-medium text-muted">
              Bookmark resources you want to revisit before exams.
            </p>
            <Link href="/recent-uploads" className="motion-hover motion-active mt-4 inline-flex rounded-xl bg-warning px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              Bookmark Resources
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <ErrorBoundary
      title="Bookmarks could not load"
      message="Your saved library ran into a problem. The rest of the portal stays available."
    >
      <BookmarksContent />
    </ErrorBoundary>
  );
}
