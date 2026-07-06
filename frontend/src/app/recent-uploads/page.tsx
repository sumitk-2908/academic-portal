"use client";

import { useEffect, useState, useRef } from "react";
import { trackDocumentStat, searchDocuments, supabase } from "../lib/api";
import { Upload, Eye, Download, FileText, NotebookPen, FileQuestion, ListChecks, Bookmark } from "lucide-react";
import Link from "next/link";
import { getUploadPromptCopy, recordStudentDownload, requestUploadPrompt, shouldShowContributionPrompt, dismissContributionPrompt } from "../lib/student-prompts";
import { requestAuthPrompt } from "../lib/auth-prompts";
import { manageOfflinePdf } from "../lib/offline-manager";
import { DocumentGridSkeleton, InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { DocumentWithAnalytics } from "@/app/lib/document-types";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

function RecentUploadsContent() {
  const [documents, setDocuments] = useState<DocumentWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContributionPrompt, setShowContributionPrompt] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<number[]>([]);

  const downloadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      const rawBookmarks = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
      const bookmarkIds = rawBookmarks.map((b: any) => typeof b === "object" ? b.id : b);
      setBookmarks(bookmarkIds);
      setShowContributionPrompt(shouldShowContributionPrompt(bookmarkIds.length));

      const { data: sess } = await supabase.auth.getSession();
      setUserId(sess?.session?.user?.id || null);

      const response = await searchDocuments({ limit: 24, sortBy: "created_at", sortOrder: "desc" });
      setDocuments(response.data);
      setLoading(false);
    };
    fetchRecent();
  }, []);

  const toggleBookmark = async (doc: any) => {
    if (!userId) {
      requestAuthPrompt("bookmark");
      return;
    }

    const isBookmarked = bookmarks.includes(doc.id);
    const nextBookmarks = isBookmarked ? bookmarks.filter(id => id !== doc.id) : [...bookmarks, doc.id];
    setBookmarks(nextBookmarks);

    const currentStorage = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]");
    const nextStorage = isBookmarked
      ? currentStorage.filter((b: any) => (typeof b === "object" ? b.id : b) !== doc.id)
      : [...currentStorage, { id: doc.id, bookmarked_at: new Date().toISOString() }];

    localStorage.setItem("portal_bookmarks", JSON.stringify(nextStorage));

    if (isBookmarked) {
      if (doc.file_url) manageOfflinePdf(doc.file_url, "REMOVE_PDF").catch(console.error);
      await supabase.from("student_bookmarks").delete().match({ user_id: userId, document_id: doc.id });
    } else {
      if (doc.file_url) manageOfflinePdf(doc.file_url, "CACHE_PDF").catch(console.error);
      await supabase.from("student_bookmarks").insert({ user_id: userId, document_id: doc.id });
      setShowContributionPrompt(shouldShowContributionPrompt(nextBookmarks.length));
    }

    window.dispatchEvent(new Event("sidebar_update"));
  };

  const handleDownload = async (e: React.MouseEvent, doc: any) => {
    e.preventDefault();

    if (downloadingRef.current.has(doc.id)) return;
    downloadingRef.current.add(doc.id);
    setDownloadingIds((prev) => [...prev, doc.id]);

    try {
      await trackDocumentStat(doc.id, "download");
      const downloadCount = recordStudentDownload();
      if (downloadCount >= 3) setShowContributionPrompt(shouldShowContributionPrompt(0));
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

  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center gap-4 rounded-3xl border border-success/20 bg-success/5 p-6 shadow-sm">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-success text-white">
          <Upload size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recent Uploads</h1>
          <p className="mt-1 text-sm font-semibold tracking-wider text-success">The newest resources added to the portal</p>
        </div>
      </div>

      {showContributionPrompt && (
        <div className="flex flex-col gap-4 rounded-2xl border border-success/20 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-tight text-foreground">These resources helped you.</p>
            <p className="mt-1 text-sm leading-6 font-medium text-muted">Consider uploading your own notes to help future students.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={requestUploadPrompt} className="motion-hover motion-active rounded-xl bg-success px-4 py-2 text-sm font-bold text-white hover:opacity-90">
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

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full"><DocumentGridSkeleton count={6} /></div>
        ) : documents.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-success/30 bg-success/5 p-8 text-center">
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">{getUploadPromptCopy(0).title}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 font-medium text-muted">{getUploadPromptCopy(0).message}</p>
            <button onClick={requestUploadPrompt} className="motion-hover motion-active mt-4 inline-flex rounded-xl bg-success px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              Upload Notes
            </button>
          </div>
        ) : (
          documents.map((doc) => {
            const Icon = CATEGORY_ICONS[doc.category] || FileText;
            return (
              <article className="group motion-hover flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm hover:-translate-y-0.5 hover:border-success" key={doc.id}>
                <div className="flex items-start justify-between">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                    <Icon size={16} />
                  </div>
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold tracking-[0.06em] text-muted uppercase">
                    {doc.subject}
                  </span>
                </div>

                <h3 className="mt-3 line-clamp-2 min-h-[2rem] text-sm font-bold tracking-tight text-foreground">
                  {doc.title}
                </h3>

                <div className="mt-4 flex gap-2 border-t border-border pt-3">
                  <button
                    onClick={(e) => handleDownload(e, doc)}
                    className="motion-hover motion-active inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2 text-sm font-bold text-foreground hover:bg-surface-hover"
                  >
                    {downloadingIds.includes(doc.id) ? <InlineSpinner label="Downloading" size={12} /> : <Download size={12} />} Download
                  </button>

                  <Link
                    href={`/subject/${doc.subject.toLowerCase().replace(/ /g, "-")}/module-${doc.module_id || 1}/${doc.id}`}
                    className="motion-hover motion-active inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    <Eye size={12} /> View
                  </Link>

                  <button
                    onClick={() => toggleBookmark(doc)}
                    className={`motion-hover motion-active rounded-xl border p-2 ${
                      bookmarks.includes(doc.id)
                        ? "border-warning bg-warning text-white"
                        : "border-warning/30 text-warning hover:bg-warning/10"
                    }`}
                    aria-label={bookmarks.includes(doc.id) ? "Remove bookmark" : "Bookmark resource"}
                  >
                    <Bookmark size={14} className={bookmarks.includes(doc.id) ? "fill-white text-white" : "text-warning"} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function RecentUploadsPage() {
  return (
    <ErrorBoundary
      title="Uploads could not load"
      message="The recent uploads section hit an unexpected problem. Retry it or continue using the rest of the portal."
    >
      <RecentUploadsContent />
    </ErrorBoundary>
  );
}
