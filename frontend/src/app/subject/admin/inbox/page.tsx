"use client";

import { useEffect, useState } from "react";
import { supabase, updateDocumentStatus, deleteDocument } from "../../../lib/api";
import { Inbox, CheckCircle, Trash2, Eye, FileText, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AdminInboxAuditingRoute() {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInbox = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (data) setPendingDocs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleApprove = async (id: number) => {
    await updateDocumentStatus(id, 'approved');
    setPendingDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("Reject and permanently delete submission?")) return;
    await deleteDocument(id);
    setPendingDocs(prev => prev.filter(d => d.id !== id));
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 animate-fade-up">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
        <ArrowLeft size={14} /> Back to Hub
      </Link>

      <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Inbox size={24} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">Student Submissions Inbox</h1>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Audit crowdsourced assets prior to live global indexing deployment.</p>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-500" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pendingDocs.map(doc => {
            // UI TRICK: Split the title and author back apart
            const titleParts = doc.title.split(' |By| ');
            const cleanTitle = titleParts[0];
            
            // If it has our secret tag, show the typed name. 
            // If it's an older document with an ugly UUID (36 chars), show a fallback.
            const authorName = titleParts.length > 1 
              ? titleParts[1] 
              : (doc.uploaded_by?.length === 36 ? "Verified Student" : doc.uploaded_by);

            return (
              <article key={doc.id} className="flex flex-col rounded-2xl border border-amber-500/20 bg-white p-4 shadow-sm dark:bg-[#111827]">
                <div className="flex justify-between items-start">
                  <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full">PENDING AUDIT</span>
                </div>
                
                {/* Render the Cleaned Title */}
                <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{cleanTitle}</h3>
                
                <p className="text-[10px] text-[#64748B] mt-2 font-semibold">
                  {doc.subject} • Module {doc.module_id || 1}
                </p>
                
                {/* Render the Cleaned Author Name */}
                <p className="text-[10px] text-[#64748B] mt-0.5">By: {authorName}</p>
                
                <div className="mt-auto flex gap-2 border-t border-[#E5E7EB] pt-4 dark:border-[#1F2A44]">
                  {/* PREVIEW BUTTON */}
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#6366F1]"
                  >
                    <Eye size={12} /> Preview
                  </a>

                  {/* APPROVE BUTTON */}
                  <button 
                    onClick={() => handleApprove(doc.id)} 
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-600"
                  >
                    <CheckCircle size={12} /> Approve
                  </button>

                  {/* REJECT BUTTON */}
                  <button 
                    onClick={() => handleReject(doc.id)} 
                    className="flex items-center justify-center rounded-xl border border-red-500/30 p-2 text-red-500 transition-colors hover:bg-red-500/10"
                    title="Reject & Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
          {pendingDocs.length === 0 && (
            <p className="col-span-full text-center py-12 text-xs text-[#64748B]">Inbox clear! No outstanding crowdsourcing requests.</p>
          )}
        </div>
      )}
    </main>
  );
}