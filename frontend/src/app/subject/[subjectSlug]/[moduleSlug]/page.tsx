"use client";

import { use, useEffect, useState } from "react";
import { supabase, trackDocumentStat, deleteDocument, logRecentStudyActivity } from "../../../lib/api";
import { ArrowLeft, FileText, Download, Eye, Bookmark, Trash2, NotebookPen, FileQuestion, ListChecks, Loader2 } from "lucide-react";
import Link from "next/link";

interface Document {
  id: number;
  title: string;
  category: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  module_id?: number;
  subject?: string;
  status?: string;
}

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

export default function ModulePage({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string }> }) {
  const { subjectSlug, moduleSlug } = use(params);
  const subjectName = subjectSlug.replace(/-/g, ' ').toUpperCase();
  const moduleNumber = parseInt(moduleSlug.replace('module-', '')) || 1;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModuleContextData = async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', sess.session.user.id).single();
        if (roleData?.role === 'admin' && localStorage.getItem("admin_portal_access") === "true") setIsAdmin(true);
      }

      const userBookmarks = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
      setBookmarks(userBookmarks);

      const { data } = await supabase.from('documents')
        .select('*')
        .ilike('subject', subjectName)
        .eq('module_id', moduleNumber)
        .eq('status', 'approved');
      if (data) setDocuments(data);
      setLoading(false);
    };

    fetchModuleContextData();
  }, [subjectName, moduleNumber]);

  const toggleBookmark = async (id: number) => {
    const isBookmarked = bookmarks.includes(id);
    const nextB = isBookmarked ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
    setBookmarks(nextB);
    localStorage.setItem("portal_bookmarks", JSON.stringify(nextB));
    window.dispatchEvent(new Event("sidebar_update"));
  };

  const handleDownload = (e: React.MouseEvent, doc: Document) => {
    e.preventDefault();
    trackDocumentStat(doc.id, 'download');
    const link = document.createElement("a");
    link.href = `${doc.file_url}?download=${encodeURIComponent(doc.title)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Confirm file deletion?")) return;
    await deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    window.dispatchEvent(new Event("sidebar_update"));
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto">
      <Link href={`/subject/${subjectSlug}`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
        <ArrowLeft size={14} /> Back to {subjectName}
      </Link>

      <div className="border-b pb-4 dark:border-[#1F2A44]">
        <h1 className="text-xl font-extrabold sm:text-2xl">{subjectName}</h1>
        <p className="text-xs font-bold text-[#4F46E5] mt-1">Module {moduleNumber} Repository</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#4F46E5]" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => {
            const Icon = CATEGORY_ICONS[doc.category] || FileText;
            return (
              <article key={doc.id} className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#111827]">
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 bg-[#4F46E5]/10 text-[#4F46E5] rounded-xl flex items-center justify-center"><Icon size={16} /></div>
                  <span className="text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{doc.category}</span>
                </div>
                <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
                <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
                  <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#F8FAFC] py-2 rounded-xl border dark:bg-[#1F2A44]">
                    <Download size={12} /> Download
                  </button>
                  <Link href={`/subject/${subjectSlug}/${moduleSlug}/${doc.id}`} onClick={() => { trackDocumentStat(doc.id, 'view'); logRecentStudyActivity(doc); }} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#4F46E5] text-white py-2 rounded-xl">
                    <Eye size={12} /> View
                  </Link>
                  <button onClick={() => toggleBookmark(doc.id)} className={`p-2 rounded-xl border ${bookmarks.includes(doc.id) ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : ""}`}>
                    <Bookmark size={14} className={bookmarks.includes(doc.id) ? "fill-amber-500" : ""} />
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(doc.id)} className="p-2 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/5">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {documents.length === 0 && (
            <p className="col-span-full text-center py-12 text-xs text-[#64748B]">No items indexed for this module.</p>
          )}
        </div>
      )}
    </div>
  );
}