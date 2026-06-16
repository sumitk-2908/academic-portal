"use client";

import { useEffect, useState } from "react";
import { supabase, updateDocumentStatus, deleteDocument } from "../../../lib/api";
import { Inbox, CheckCircle, Trash2, Eye, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminInboxAuditingRoute() {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInbox = async () => {
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').eq('status', 'pending').order('created_at', { ascending: false });
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6 animate-fade-up">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
        <ArrowLeft size={14} /> Back to Hub
      </Link>

      <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center"><Inbox size={24} /></div>
        <div>
          <h1 className="text-xl font-extrabold">Student Submissions Approval Inbox</h1>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Audit crowdsourced assets prior to live global indexing deployment.</p>
        </div>
      </section>

      {loading ? (
        <p className="text-center py-12 text-xs">Auditing pipeline database locks...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pendingDocs.map(doc => (
            <article key={doc.id} className="rounded-2xl border border-amber-500/20 bg-white p-4 shadow-sm dark:bg-[#111827]">
              <div className="flex justify-between items-start">
                <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><FileText size={16} /></div>
                <span className="text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full">PENDING AUDIT</span>
              </div>
              <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
              <p className="text-[10px] text-[#64748B] mt-1 font-semibold">{doc.subject} • Submitted by: {doc.uploaded_by}</p>
              
              <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
                <button onClick={() => handleApprove(doc.id)} className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-bold bg-emerald-500 text-white py-2 rounded-xl">
                  <CheckCircle size={12} /> Approve
                </button>
                <button onClick={() => handleReject(doc.id)} className="p-2 rounded-xl border border-red-500 text-red-500 hover:bg-red-500/5">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
          {pendingDocs.length === 0 && (
            <p className="col-span-full text-center py-12 text-xs text-[#64748B]">Inbox clear! No outstanding crowdsourcing requests.</p>
          )}
        </div>
      )}
    </main>
  );
}