"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Download, Eye, Bookmark, Trash2, NotebookPen, FileQuestion, ListChecks, Loader2 } from "lucide-react";
import { trackDocumentStat, deleteDocument, supabase, getPaginatedDocumentsByModule } from "@/app/lib/api";
import { manageOfflinePdf } from "@/app/lib/offline-manager";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

const getTimeAgo = (dateStr: string) => {
  const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};

export interface PaginationConfig {
  queryKey: string[];
  moduleId: number;
}

export default function DocumentInteractiveGrid({ 
  initialDocuments, 
  subjectSlug, 
  loading = false,
  paginationConfig 
}: { 
  initialDocuments: any[]; 
  subjectSlug: string;
  loading?: boolean;
  paginationConfig?: PaginationConfig;
}) {
  const queryClient = useQueryClient();
  const [localDocuments, setLocalDocuments] = useState(initialDocuments);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cols, setCols] = useState(1);

  // --- DATA STRATEGY: React Query (if paginated) OR Local State (if static) ---
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: paginationConfig ? paginationConfig.queryKey : ['static-grid'],
    queryFn: ({ pageParam = 1 }) => getPaginatedDocumentsByModule(paginationConfig!.moduleId, pageParam, 20),
    initialPageParam: 1,
    enabled: !!paginationConfig,
    initialData: paginationConfig ? { pages: [{ data: initialDocuments, nextCursor: 2, total: 0 }], pageParams: [1] } : undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor,
  });

  const displayDocuments = paginationConfig 
    ? (data?.pages.flatMap(page => page.data) || [])
    : localDocuments;

  useEffect(() => {
    if (!paginationConfig) setLocalDocuments(initialDocuments);
  }, [initialDocuments, paginationConfig]);

  useEffect(() => {
    const initClientState = async () => {
      const rawBookmarks = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
      setBookmarks(rawBookmarks.map((b: any) => typeof b === 'object' ? b.id : b));

      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        setUserId(sess.session.user.id);
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', sess.session.user.id).single();
        if (roleData?.role === 'admin' && sessionStorage.getItem("admin_portal_auth") === "true") setIsAdmin(true);
      }
    };
    initClientState();

    const updateCols = () => {
      if (window.innerWidth >= 1024) setCols(3);
      else if (window.innerWidth >= 640) setCols(2);
      else setCols(1);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  // --- VIRTUALIZATION ---
  const rowCount = Math.ceil(displayDocuments.length / cols);
  
  const virtualizer = useWindowVirtualizer({
    count: hasNextPage ? rowCount + 1 : rowCount,
    estimateSize: () => 320, 
    overscan: 2, 
  });

  const virtualItems = virtualizer.getVirtualItems();
  
  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= rowCount - 1 && hasNextPage && !isFetchingNextPage && paginationConfig) {
      fetchNextPage();
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, fetchNextPage, rowCount, paginationConfig]);

  // --- HANDLERS ---
  const toggleBookmark = async (id: number) => {
    const isBookmarked = bookmarks.includes(id);
    const nextB = isBookmarked ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
    setBookmarks(nextB);
    
    const targetDoc = displayDocuments.find(d => d.id === id);
    const currentStorage = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
    let newStorage;
    
    if (isBookmarked) {
      newStorage = currentStorage.filter((b: any) => (typeof b === 'object' ? b.id : b) !== id);
      if (targetDoc?.file_url) manageOfflinePdf(targetDoc.file_url, 'REMOVE_PDF').catch(console.error);
      if (userId) await supabase.from('student_bookmarks').delete().match({ user_id: userId, document_id: id });
    } else {
      newStorage = [...currentStorage, { id, bookmarked_at: new Date().toISOString() }];
      if (targetDoc?.file_url) manageOfflinePdf(targetDoc.file_url, 'CACHE_PDF').catch(console.error);
      if (userId) await supabase.from('student_bookmarks').insert({ user_id: userId, document_id: id });
    }
    
    localStorage.setItem("portal_bookmarks", JSON.stringify(newStorage));
    window.dispatchEvent(new Event("sidebar_update"));
  };

  const handleDownload = async (e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    trackDocumentStat(doc.id, 'download');
    try {
      const response = await fetch(doc.file_url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const localUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = localUrl;
      link.download = `${doc.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(localUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download document. Ensure CORS is configured.");
    }
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;
    await deleteDocument(documentToDelete);
    
    // 1. Update static state instantly
    setLocalDocuments(prev => prev.filter(d => d.id !== documentToDelete));
    
    // 2. Update React Query paginated cache instantly
    if (paginationConfig) {
      queryClient.setQueryData(paginationConfig.queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((d: any) => d.id !== documentToDelete)
          }))
        };
      });
    }
    
    window.dispatchEvent(new Event("sidebar_update"));
    setDocumentToDelete(null);
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/50" />
        ))}
      </div>
    );
  }

  if (displayDocuments.length === 0 && !hasNextPage) {
    return <p className="col-span-full py-12 text-center text-xs text-[#64748B]">No items indexed for this selection.</p>;
  }

  return (
    <>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > rowCount - 1;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gap: '1rem',
                paddingBottom: '1rem'
              }}
            >
              {isLoaderRow ? (
                 <div className="col-span-full flex justify-center py-6">
                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                 </div>
              ) : (
                Array.from({ length: cols }).map((_, colIndex) => {
                  const itemIndex = virtualRow.index * cols + colIndex;
                  const doc = displayDocuments[itemIndex];
                  
                  if (!doc) return <div key={`empty-${colIndex}`} />;

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
                      <p className="text-[10px] font-semibold text-indigo-500 truncate mt-0.5">
                        Uploaded by {doc.uploader_name || 'Anonymous'}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                        {doc.page_count ? `${doc.page_count} pages` : 'PDF Document'} · {doc.file_size ? `${doc.file_size.toFixed(1)} MB` : 'Unknown size'} · uploaded {getTimeAgo(doc.created_at)}
                      </p>
                      
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
                })
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog.Root open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-lg duration-200 dark:border-[#1F2A44] dark:bg-[#0B1020]">
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
    </>
  );
}