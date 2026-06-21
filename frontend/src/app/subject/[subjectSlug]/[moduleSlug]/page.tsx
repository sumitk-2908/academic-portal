"use client";

import { use, useEffect, useState } from "react";
import { supabase, trackDocumentStat, deleteDocument } from "../../../lib/api";
import { ArrowLeft, FileText, Download, Eye, Bookmark, Trash2, NotebookPen, FileQuestion, ListChecks } from "lucide-react";
import Link from "next/link";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { manageOfflinePdf } from "../../../lib/offline-manager";

interface Document {
  id: number;
  title: string;
  category: string;
  file_url: string;
  uploaded_by: string;
  uploader_name?: string;
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

export default function ModulePage({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string }> }) {
  const { subjectSlug, moduleSlug } = use(params);
  const subjectName = subjectSlug.replace(/-/g, ' ').toUpperCase();
  const moduleNumber = parseInt(moduleSlug.replace('module-', '')) || 1;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);

  useEffect(() => {
    const fetchModuleContextData = async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', sess.session.user.id).single();
        if (roleData?.role === 'admin' && sessionStorage.getItem("admin_portal_auth") === "true") setIsAdmin(true);
      }

      const rawBookmarks = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
      const userBookmarks = rawBookmarks.map((b: any) => typeof b === 'object' ? b.id : b);
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
    
    // Find the specific document so we can get its file_url
    const targetDoc = documents.find(d => d.id === id);
    
    const currentStorage = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
    let newStorage;
    
    if (isBookmarked) {
      // 1. User is REMOVING the bookmark
      newStorage = currentStorage.filter((b: any) => (typeof b === 'object' ? b.id : b) !== id);
      
      // Trigger Service Worker to delete the PDF from device storage
      if (targetDoc?.file_url) {
        manageOfflinePdf(targetDoc.file_url, 'REMOVE_PDF').catch(console.error);
      }
    } else {
      // 2. User is ADDING the bookmark
      newStorage = [...currentStorage, { id, bookmarked_at: new Date().toISOString() }];
      
      // Trigger Service Worker to download and cache the PDF
      if (targetDoc?.file_url) {
        manageOfflinePdf(targetDoc.file_url, 'CACHE_PDF').catch(console.error);
      }
    }
    
    localStorage.setItem("portal_bookmarks", JSON.stringify(newStorage));
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

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    await deleteDocument(documentToDelete);
    setDocuments(prev => prev.filter(d => d.id !== documentToDelete));
    window.dispatchEvent(new Event("sidebar_update"));
    setDocumentToDelete(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-up">
      <Link href={`/subject/${subjectSlug}`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
        <ArrowLeft size={14} /> Back to {subjectName}
      </Link>

      <div className="border-b pb-4 dark:border-[#1F2A44]">
        <h1 className="text-xl font-extrabold sm:text-2xl">{subjectName}</h1>
        <p className="mt-1 text-xs font-bold text-[#4F46E5]">Module {moduleNumber} Repository</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
            ))}
          </>
        ) : documents.map(doc => {
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
              <p className="mt-0.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">by {doc.uploader_name || 'Anonymous'}</p>
              <p className="mt-1.5 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">{doc.page_count ? `${doc.page_count} pages` : 'PDF Document'} · {doc.file_size ? `${doc.file_size.toFixed(1)} MB` : 'Unknown size'} · uploaded {getTimeAgo(doc.created_at)}</p>

              <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
                <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border bg-[#F8FAFC] py-2 text-[11px] font-bold dark:bg-[#1F2A44] hover:bg-gray-100 transition-colors">
                  <Download size={12} /> Download
                </button>
                <Link href={`/subject/${subjectSlug}/module-${doc.module_id || 1}/${doc.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#4F46E5] text-white py-2 rounded-xl">
                  <Eye size={12} /> View
                </Link>
                <button onClick={() => toggleBookmark(doc.id)} className={`rounded-xl border p-2 transition-colors ${bookmarks.includes(doc.id) ? "bg-amber-400 text-white border-amber-400" : "border-amber-400 text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10"}`}>
                  <Bookmark size={14} className={bookmarks.includes(doc.id) ? "fill-white text-white" : "text-amber-400"} />
                </button>
                {isAdmin && (
                  <button onClick={() => setDocumentToDelete(doc.id)} className="rounded-xl border border-red-500/30 p-2 text-red-500 hover:bg-red-500/5">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {documents.length === 0 && !loading && (
          <p className="col-span-full py-12 text-center text-xs text-[#64748B]">No items indexed for this module.</p>
        )}
      </div>

      <AlertDialog.Root open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] dark:border-[#1F2A44] dark:bg-[#0B1020]">
            <AlertDialog.Title className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1F2A44]">Cancel</button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button onClick={confirmDelete} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600">Delete Document</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}