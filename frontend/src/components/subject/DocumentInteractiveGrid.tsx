"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, FileQuestion, Upload } from "lucide-react";
import { trackDocumentStat, deleteDocument, supabase, getPaginatedDocumentsByModule } from "@/app/lib/api";
import { manageOfflinePdf } from "@/app/lib/offline-manager";
import { requestAuthPrompt } from "@/app/lib/auth-prompts";
import { getUploadPromptCopy, recordStudentDownload, requestUploadPrompt, shouldShowContributionPrompt, dismissContributionPrompt } from "@/app/lib/student-prompts";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { LoadingGrid, EmptyState, CenteredSpinner } from "@/components/layout/SharedLayouts";
import DocumentCard from "@/components/ui/DocumentCard";

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
  const [showContributionPrompt, setShowContributionPrompt] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);

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
      const bookmarkIds = rawBookmarks.map((b: any) => typeof b === 'object' ? b.id : b);
      setBookmarks(bookmarkIds);
      setShowContributionPrompt(shouldShowContributionPrompt(bookmarkIds.length));

      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        setUserId(sess.session.user.id);
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', sess.session.user.id).single();
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (roleData?.role === 'admin' && aalData?.currentLevel === 'aal2') setIsAdmin(true);
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
    estimateSize: () => 380, 
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
    if (!userId) {
      requestAuthPrompt("bookmark");
      return;
    }

    const isBookmarked = bookmarks.includes(id);
    const nextB = isBookmarked ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
    setBookmarks(nextB);
    if (!isBookmarked) setShowContributionPrompt(shouldShowContributionPrompt(nextB.length));
    
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
    if (downloadingIds.includes(doc.id)) return;
    setDownloadingIds((prev) => [...prev, doc.id]);
    trackDocumentStat(doc.id, 'download');
    const downloadCount = recordStudentDownload();
    if (downloadCount >= 3) setShowContributionPrompt(shouldShowContributionPrompt(bookmarks.length));
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
    } finally {
      setTimeout(() => {
        setDownloadingIds((prev) => prev.filter((id) => id !== doc.id));
      }, 800);
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

  if (loading) return <LoadingGrid count={6} />;
  if (displayDocuments.length === 0 && !hasNextPage) {
    const uploadCopy = getUploadPromptCopy(displayDocuments.length);

    return (
      <EmptyState
        title={uploadCopy.title}
        message={uploadCopy.message}
        icon={FileQuestion}
        action={
          <>
            <button onClick={requestUploadPrompt} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
              <Upload size={15} /> Upload Notes
            </button>
            <Link href="/recent-uploads" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground motion-hover motion-active hover:bg-surface-hover">
              <Eye size={15} /> Start Studying
            </Link>
          </>
        }
      />
    );
  }

  return (
    <>
      {showContributionPrompt && (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-tight text-foreground">These resources helped you.</p>
            <p className="mt-1 text-sm font-medium leading-6 text-muted">Consider uploading your own notes to help future students.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={requestUploadPrompt} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
              <Upload size={15} /> Upload Notes
            </button>
            <button
              onClick={() => {
                dismissContributionPrompt();
                setShowContributionPrompt(false);
              }}
              className="rounded-xl px-3 py-2 text-sm font-bold text-muted motion-hover motion-active hover:bg-surface-hover"
            >
              Later
            </button>
          </div>
        </div>
      )}
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
                gap: '1.5rem',
                paddingBottom: '1.5rem'
              }}
            >
              {isLoaderRow ? (
                 <CenteredSpinner />
              ) : (
                Array.from({ length: cols }).map((_, colIndex) => {
                  const itemIndex = virtualRow.index * cols + colIndex;
                  const doc = displayDocuments[itemIndex];
                  
                  if (!doc) return <div key={`empty-${colIndex}`} />;

                  return (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      subjectSlug={subjectSlug}
                      isBookmarked={bookmarks.includes(doc.id)}
                      isAdmin={isAdmin}
                      onDownload={handleDownload}
                      onToggleBookmark={toggleBookmark}
                      onDelete={setDocumentToDelete}
                      isDownloading={downloadingIds.includes(doc.id)}
                    />
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog.Root open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-border bg-surface p-6 shadow-lg motion-modal">
            <AlertDialog.Title className="text-lg font-bold text-foreground">Confirm Deletion</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-muted">
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button className="rounded-xl px-4 py-2 text-sm font-bold text-muted motion-hover motion-active hover:bg-surface-hover">Cancel</button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button onClick={confirmDelete} className="rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground motion-hover motion-active hover:opacity-90">Delete Document</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
