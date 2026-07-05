"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, getStudentBookmarks, trackDocumentStat } from "../lib/api";
import { Bookmark, Download, Eye, FileText, Loader2, NotebookPen, FileQuestion, ListChecks } from "lucide-react";
import Link from "next/link";
import { manageOfflinePdf } from "../lib/offline-manager";
import { requestAuthPrompt } from "../lib/auth-prompts";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

export default function BookmarksPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isSignedOut, setIsSignedOut] = useState(false);
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
    const nextDocs = documents.filter(d => d.id !== id);
    setDocuments(nextDocs);
    const nextIds = nextDocs.map(d => d.id);
    localStorage.setItem("portal_bookmarks", JSON.stringify(nextIds));

    if (docToRemove?.file_url) {
      manageOfflinePdf(docToRemove.file_url, 'REMOVE_PDF').catch(console.error);
    }
    
    if (userId) {
      await supabase.from('student_bookmarks').delete().match({ user_id: userId, document_id: id });
    }
    window.dispatchEvent(new Event("sidebar_update"));
  };

  const handleDownload = async (e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    
    if (downloadingRef.current.has(doc.id)) return;
    downloadingRef.current.add(doc.id);

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
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto w-full">
      <div className="rounded-3xl border border-warning/20 bg-warning/5 p-6 shadow-sm flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-warning text-primary-foreground flex items-center justify-center shrink-0">
          <Bookmark size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">My Bookmarks</h1>
          <p className="text-sm font-semibold tracking-wider text-warning mt-1">Your saved PDFs and study materials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-warning" /></div>
        ) : isSignedOut ? (
          <div className="col-span-full rounded-2xl border border-dashed border-warning/30 bg-warning/5 p-8 text-center">
            <p className="mx-auto max-w-md text-sm font-medium leading-6 text-muted">
              Sign in to sync your bookmarks and continue studying across all your devices.
            </p>
            <button onClick={() => requestAuthPrompt("bookmark")} className="mt-4 rounded-xl bg-warning px-4 py-2 text-sm font-bold text-white motion-hover motion-active hover:opacity-90">
              Save Bookmarks
            </button>
          </div>
        ) : documents.map(doc => {
          const Icon = CATEGORY_ICONS[doc.category] || FileText;
          return (
            <article key={doc.id} className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm motion-hover hover:-translate-y-0.5 hover:border-warning">
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 bg-warning/10 text-warning rounded-xl flex items-center justify-center"><Icon size={16} /></div>
                <span className="text-xs font-bold uppercase tracking-[0.06em] bg-surface-hover px-2 py-0.5 rounded-full text-muted">{doc.subject}</span>
              </div>
              <h3 className="text-sm font-bold mt-3 line-clamp-2 min-h-[2rem] text-foreground tracking-tight">{doc.title}</h3>
              <div className="mt-4 flex gap-2 border-t border-border pt-3">
                <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-surface py-2 rounded-xl border border-border motion-hover motion-active hover:bg-surface-hover text-foreground">
                  <Download size={12} /> Download
                </button>
                <Link href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-warning text-white py-2 rounded-xl motion-hover motion-active hover:opacity-90">
                  <Eye size={12} /> View
                </Link>
                <button onClick={() => toggleBookmark(doc.id)} className="p-2 rounded-xl border border-warning/30 bg-warning/10 text-warning shrink-0 motion-hover motion-active">
                  <Bookmark size={14} className="fill-warning" />
                </button>
              </div>
            </article>
          );
        })}
        {documents.length === 0 && !loading && !isSignedOut && (
          <p className="col-span-full text-center py-12 text-sm font-medium text-muted">You have not bookmarked any documents yet.</p>
        )}
      </div>
    </div>
  );
}
