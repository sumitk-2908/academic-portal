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
        
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', sess.session.user.id)
          .single();
          
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const isMfaVerified = aalData?.currentLevel === 'aal2';

        if (roleData?.role === 'admin' && isMfaVerified) {
          setIsAdmin(true);
        }
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
    
    setLocalDocuments(prev => prev.filter(d => d.id !== documentToDelete));
    
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
          <div key={i} className="h-64 w-full animate-pulse rounded-2xl bg-surface-hover" />
        ))}
      </div>
    );
  }

  if (displayDocuments.length === 0 && !hasNextPage) {
    return <p className="col-span-full py-12 text-center text-xs text-muted">No items indexed for this selection.</p>;
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
                    <Loader2 className="animate-spin text-primary" size={24} />
                 </div>
              ) : (
                Array.from({ length: cols }).map((_, colIndex) => {
                  const itemIndex = virtualRow.index * cols + colIndex;
                  const doc = displayDocuments[itemIndex];
                  
                  if (!doc) return <div key={`empty-${colIndex}`} />;

                  const Icon = CATEGORY_ICONS[doc.category] || FileText;

                  return (
                    <article key={doc.id} className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm motion-hover hover:-translate-y-0.5 hover:border-primary">
                      <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl bg-background flex items-center justify-center">
                        {doc.thumbnail_url ? (
                          <img src={doc.thumbnail_url} alt={`${doc.title} thumbnail`} className="object-cover object-top w-full h-full opacity-90 motion-hover group-hover:opacity-100" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted">
                            <Icon size={32} className="opacity-50" />
                          </div>
                        )}
                        <span className="absolute top-2 right-2 rounded-full bg-slate-900/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-sm">
                          {doc.category}
                        </span>
                      </div>

                      <h3 className="text-xs font-bold mt-1 line-clamp-2 min-h-[2rem] text-foreground">{doc.title}</h3>
                      <p className="text-[10px] font-semibold text-primary truncate mt-0.5">
                        Uploaded by {doc.uploader_name || 'Anonymous'}
                      </p>
                      <p className="mt-1.5 text-[10px] font-medium text-muted">
                        {doc.page_count ? `${doc.page_count} pages` : 'PDF Document'} · {doc.file_size ? `${doc.file_size.toFixed(1)} MB` : 'Unknown size'} · uploaded {getTimeAgo(doc.created_at)}
                      </p>
                      
                      <div className="mt-4 flex gap-2 border-t border-border pt-3">
                        <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-transparent bg-surface-hover py-2 text-[11px] font-bold text-foreground hover:opacity-80 motion-hover motion-active">
                          <Download size={12} /> Download
                        </button>
                        <Link href={`/subject/${subjectSlug}/module-${doc.module_id || 1}/${doc.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-primary text-primary-foreground py-2 rounded-xl hover:opacity-90 transition-opacity motion-hover motion-active">
                          <Eye size={12} /> View
                        </Link>
                        <button onClick={() => toggleBookmark(doc.id)} className={`rounded-xl border p-2 transition-colors ${bookmarks.includes(doc.id) ? "bg-warning text-white border-warning motion-hover motion-active" : "border-warning text-warning hover:bg-warning/10 motion-hover motion-active"}`}>
                          <Bookmark size={14} className={bookmarks.includes(doc.id) ? "fill-white text-white" : "text-warning"} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => setDocumentToDelete(doc.id)} className="rounded-xl border border-destructive/30 p-2 text-destructive hover:bg-destructive/10 transition-colors motion-hover motion-active">
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
          <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border bg-surface p-6 shadow-lg motion-modal">
            <AlertDialog.Title className="text-lg font-bold text-foreground">Confirm Deletion</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted">
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button className="rounded-xl px-4 py-2 text-sm font-bold text-muted transition-colors hover:bg-surface-hover">Cancel</button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button onClick={confirmDelete} className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90">Delete Document</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}