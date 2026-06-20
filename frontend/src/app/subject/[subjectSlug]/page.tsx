"use client";

import { use, useEffect, useState, useMemo } from "react";
import { supabase, trackDocumentStat, deleteDocument } from "../../lib/api";
import { Layers, Bookmark, NotebookPen, FileQuestion, ListChecks, Download, Eye, Trash2, FileText } from "lucide-react";
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
  file_size?: number;
  page_count?: number;
  thumbnail_url?: string;
}

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

const getTimeAgo = (dateStr: string) => {
  const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};

export default function SubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const { subjectSlug } = use(params);
  const subjectName = subjectSlug.replace(/-/g, ' ').toUpperCase();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "notes" | "pyq" | "syllabus" | "bookmarks">("dashboard");
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  const isNonModuleSubject = useMemo(() => {
    const explicit = ["WORKSHOP", "ENGINEERING GRAPHICS", "COMMUNICATION SKILLS", "NSS"];
    return explicit.includes(subjectName) || subjectName.endsWith("LAB");
  }, [subjectName]);

  useEffect(() => {
    const loadWorkspaceContext = async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        setUserId(sess.session.user.id);
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', sess.session.user.id).single();
        // SECURE MFA CHECK
        if (roleData?.role === 'admin' && sessionStorage.getItem("admin_portal_auth") === "true") setIsAdmin(true);
      }
      
      const userBookmarks = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
      setBookmarks(userBookmarks);

      const { data: docs } = await supabase.from('documents').select('*').ilike('subject', subjectName).eq('status', 'approved');
      if (docs) setDocuments(docs);
      setLoading(false);
    };

    loadWorkspaceContext();
  }, [subjectName]);

  const toggleBookmark = async (id: number) => {
    const isBookmarked = bookmarks.includes(id);
    const nextB = isBookmarked ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
    setBookmarks(nextB);
    localStorage.setItem("portal_bookmarks", JSON.stringify(nextB));
    
    if (userId) {
      if (isBookmarked) await supabase.from('student_bookmarks').delete().match({ user_id: userId, document_id: id });
      else await supabase.from('student_bookmarks').insert({ user_id: userId, document_id: id });
    }
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
    if (!window.confirm("Delete this document?")) return;
    await deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    window.dispatchEvent(new Event("sidebar_update"));
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (activeTab === "bookmarks") return bookmarks.includes(doc.id);
      if (activeTab === "dashboard") return true;
      return doc.category === activeTab;
    });
  }, [documents, activeTab, bookmarks]);

  const tabCounts = useMemo(() => {
    return {
      dashboard: -1, 
      notes: documents.filter(d => d.category === "notes").length,
      pyq: documents.filter(d => d.category === "pyq").length,
      syllabus: documents.filter(d => d.category === "syllabus").length,
    };
  }, [documents]);

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto">
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
        <h1 className="text-xl font-extrabold sm:text-3xl">{subjectName}</h1>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Core Subject Curricular Interface</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#E5E7EB] pb-1 dark:border-[#1F2A44]">
        {["dashboard", "notes", "pyq", "syllabus"].map(tab => {
          const count = tabCounts[tab as keyof typeof tabCounts];
          const isZero = count === 0;

          return (
            <button
              key={tab}
              onClick={() => !isZero && setActiveTab(tab as any)}
              disabled={isZero}
              className={`px-4 py-2 text-xs font-bold border-b-2 capitalize transition-colors ${
                activeTab === tab 
                  ? "border-[#4F46E5] text-[#4F46E5]" 
                  : isZero 
                    ? "border-transparent text-gray-300 dark:text-gray-600 cursor-not-allowed" 
                    : "border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-gray-300"
              }`}
            >
              {tab} {count >= 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {activeTab === "dashboard" && !isNonModuleSubject ? (
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold uppercase text-[#64748B] tracking-wider">Course Modules</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map(num => {
              const count = documents.filter(d => d.module_id === num).length;
              return (
                <Link key={num} href={`/subject/${subjectSlug}/module-${num}`} className="group rounded-2xl border border-[#E5E7EB] bg-[#FAFAF9] p-5 text-center transition-all hover:-translate-y-1 hover:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#0B1020]">
                  <Layers size={18} className="mx-auto text-[#64748B] group-hover:text-[#4F46E5] mb-2" />
                  <p className="text-xs font-bold">Module {num}</p>
                  <p className="text-[10px] text-[#64748B] mt-1">{count} items indexed</p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
              ))}
            </>
          ) : filteredDocs.map(doc => {
            const Icon = CATEGORY_ICONS[doc.category] || FileText;
            return (
              <article key={doc.id} className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#111827]">
                
                <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center dark:bg-[#0B1020]">
                  {doc.thumbnail_url ? (
                    <img src={doc.thumbnail_url} alt={`${doc.title} thumbnail`} className="object-cover object-top w-full h-full opacity-90 transition-opacity group-hover:opacity-100" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#64748B] dark:text-[#94A3B8]">
                      <Icon size={32} className="opacity-50" />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 rounded-full bg-slate-900/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-sm">
                    {doc.category}
                  </span>
                </div>

                <h3 className="text-xs font-bold mt-1 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
                
                <p className="mt-1.5 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                  {doc.page_count ? `${doc.page_count} pages` : 'PDF Document'} · {doc.file_size ? `${doc.file_size.toFixed(1)} MB` : 'Unknown size'} · uploaded {getTimeAgo(doc.created_at)}
                </p>

                <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
                  <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#F8FAFC] py-2 rounded-xl border dark:bg-[#1F2A44]">
                    <Download size={12} /> Download
                  </button>
                  <Link 
                    href={`/subject/${subjectSlug}/module-${doc.module_id || 1}/${doc.id}`} 
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#4F46E5] text-white py-2 rounded-xl"
                  >
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
          {filteredDocs.length === 0 && !loading && (
            <p className="col-span-full text-center py-12 text-xs text-[#64748B]">No documents mapped to this category.</p>
          )}
        </div>
      )}
    </div>
  );
}