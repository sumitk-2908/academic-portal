"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, getStudentBookmarks, trackDocumentStat } from "../lib/api";
import { Bookmark, Download, Eye, FileText, Loader2, NotebookPen, FileQuestion, ListChecks } from "lucide-react";
import Link from "next/link";
import { manageOfflinePdf } from "../lib/offline-manager";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

export default function BookmarksPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const downloadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const fetchBookmarks = async (silent = false) => {
      // Avoid flickering if we are just doing a silent background update
      if (!silent) setLoading(true); 
      
      const { data: sess } = await supabase.auth.getSession();
      const currentUserId = sess?.session?.user?.id;
      
      if (currentUserId && isMounted) {
        setUserId(currentUserId);
        
        // 1. Check user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUserId)
          .single();
          
        // 2. Check MFA status securely
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const isMfaVerified = aalData?.currentLevel === 'aal2';

        // 3. Set admin state only if BOTH are true
        if (roleData?.role === 'admin' && isMfaVerified) {
          setIsAdmin(true);
        }
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

    // Listen for global updates to bypass Next.js Mobile Router caching
    window.addEventListener("sidebar_update", handleUpdate);
    // Also ensure the state updates if the user switches browser tabs
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
    
    // NEW: Lock check
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
      // NEW: Unlock after 2 seconds
      setTimeout(() => {
        downloadingRef.current.delete(doc.id);
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto w-full">
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Bookmark size={24} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold sm:text-3xl">My Bookmarks</h1>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">Your saved PDFs and study materials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-amber-500" /></div>
        ) : documents.map(doc => {
          const Icon = CATEGORY_ICONS[doc.category] || FileText;
          return (
            <article key={doc.id} className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500 dark:border-[#1F2A44] dark:bg-[#111827]">
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><Icon size={16} /></div>
                <span className="text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{doc.subject}</span>
              </div>
              <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
              <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
                <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#F8FAFC] py-2 rounded-xl border dark:bg-[#1F2A44] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]">
                  <Download size={12} /> Download
                </button>
                <Link href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-amber-500 text-white py-2 rounded-xl">
                  <Eye size={12} /> View
                </Link>
                <button onClick={() => toggleBookmark(doc.id)} className="p-2 rounded-xl border bg-amber-500/10 text-amber-500 border-amber-500/30 shrink-0">
                  <Bookmark size={14} className="fill-amber-500" />
                </button>
              </div>
            </article>
          );
        })}
        {documents.length === 0 && !loading && (
          <p className="col-span-full text-center py-12 text-xs text-[#64748B]">You haven't bookmarked any documents yet.</p>
        )}
      </div>
    </div>
  );
}