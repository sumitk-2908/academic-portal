"use client";

import { useEffect, useState } from "react";
import { supabase, trackDocumentStat } from "../lib/api";
import { Upload, Eye, Download, FileText, Loader2, NotebookPen, FileQuestion, ListChecks } from "lucide-react";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

export default function RecentUploadsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      setLoading(true);
      const { data } = await supabase.from('documents').select('*').eq('status', 'approved').order('created_at', { ascending: false }).limit(24);
      if (data) setDocuments(data);
      setLoading(false);
    };
    fetchRecent();
  }, []);

  const handleDownload = (e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    trackDocumentStat(doc.id, 'download');
    const link = document.createElement("a");
    link.href = `${doc.file_url}?download=${encodeURIComponent(doc.title)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto">
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Upload size={24} /></div>
        <div>
          <h1 className="text-xl font-extrabold sm:text-3xl">Recent Uploads</h1>
          <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-1">The newest resources added to the portal</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-emerald-500" /></div>
        ) : documents.map(doc => {
          const Icon = CATEGORY_ICONS[doc.category] || FileText;
          return (
            <article key={doc.id} className="group flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500 dark:border-[#1F2A44] dark:bg-[#111827]">
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><Icon size={16} /></div>
                <span className="text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{doc.subject}</span>
              </div>
              <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
              <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
                <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#F8FAFC] py-2 rounded-xl border dark:bg-[#1F2A44] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]">
                  <Download size={12} /> Download
                </button>
                <Link href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} onClick={() => trackDocumentStat(doc.id, 'view')} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-emerald-500 text-white py-2 rounded-xl">
                  <Eye size={12} /> View
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}