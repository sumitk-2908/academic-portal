"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, trackDocumentStat, searchDocuments } from "../lib/api";
import { Upload, Eye, Download, FileText, Loader2, NotebookPen, FileQuestion, ListChecks } from "lucide-react";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

export default function RecentUploadsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const downloadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      const response = await searchDocuments({ limit: 24, sortBy: "created_at", sortOrder: "desc" });
      setDocuments(response.data);
      setLoading(false);
    };
    fetchRecent();
  }, []);

  const handleDownload = async (e: React.MouseEvent, doc: any) => {
    e.preventDefault();

    if (downloadingRef.current.has(doc.id)) return;
    downloadingRef.current.add(doc.id);

    try {
      await trackDocumentStat(doc.id, "download");
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
      <div className="rounded-3xl border border-success/20 bg-success/5 p-6 shadow-sm flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-success text-white flex items-center justify-center shrink-0">
          <Upload size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recent Uploads</h1>
          <p className="text-sm font-semibold tracking-wider text-success mt-1">The newest resources added to the portal</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="animate-spin text-success" />
          </div>
        ) : (
          documents.map((doc) => {
            const Icon = CATEGORY_ICONS[doc.category] || FileText;
            return (
              <article className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm motion-hover hover:-translate-y-0.5 hover:border-success" key={doc.id}>
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 bg-success/10 text-success rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.06em] bg-surface-hover px-2 py-0.5 rounded-full text-muted">
                    {doc.subject}
                  </span>
                </div>

                <h3 className="text-sm font-bold mt-3 line-clamp-2 min-h-[2rem] text-foreground tracking-tight">
                  {doc.title}
                </h3>

                <div className="mt-4 flex gap-2 border-t border-border pt-3">
                  <button
                    onClick={(e) => handleDownload(e, doc)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-surface py-2 rounded-xl border border-border motion-hover motion-active hover:bg-surface-hover text-foreground"
                  >
                    <Download size={12} /> Download
                  </button>

                  <Link
                    href={`/subject/${doc.subject.toLowerCase().replace(/ /g, "-")}/module-${doc.module_id || 1}/${doc.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-success text-white py-2 rounded-xl motion-hover motion-active hover:opacity-90"
                  >
                    <Eye size={12} /> View
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}