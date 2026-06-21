"use client";

import { useEffect, useState } from "react";
import { supabase, updateDocumentStatus, deleteDocument } from "../../../lib/api";
import { Inbox, CheckCircle, Trash2, Eye, FileText, ArrowLeft, Loader2, X } from "lucide-react";
import Link from "next/link";

export default function AdminInboxAuditingRoute() {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Rejection Modal State
  const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

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

  // Opens the modal instead of instant deletion
  const handleRejectClick = (id: number) => {
    setRejectingDocId(id);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectingDocId) return;
    setIsRejecting(true);
    
    try {
      // Send the rejection to the backend (which triggers the notification)
      await updateDocumentStatus(rejectingDocId, 'rejected', rejectReason);
      
      // Optionally, you can still call deleteDocument if you don't want to keep rejected records
      // await deleteDocument(rejectingDocId);
      
      setPendingDocs(prev => prev.filter(d => d.id !== rejectingDocId));
      setRejectingDocId(null);
    } catch (error) {
      console.error("Rejection failed:", error);
      alert("Failed to reject document. Please try again.");
    } finally {
      setIsRejecting(false);
      setRejectReason("");
    }
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
            const titleParts = doc.title.split(' |By| ');
            const cleanTitle = titleParts[0];
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
                
                <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{cleanTitle}</h3>
                
                <p className="text-[10px] text-[#64748B] mt-2 font-semibold">
                  {doc.subject} • Module {doc.module_id || 1}
                </p>
                
                <p className="text-[10px] text-[#64748B] mt-0.5">By: {authorName}</p>
                
                <div className="mt-auto flex gap-2 border-t border-[#E5E7EB] pt-4 dark:border-[#1F2A44]">
                  <a 
                    href={doc.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#6366F1]"
                  >
                    <Eye size={12} /> Preview
                  </a>

                  <button 
                    onClick={() => handleApprove(doc.id)} 
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-600"
                  >
                    <CheckCircle size={12} /> Approve
                  </button>

                  <button 
                    onClick={() => handleRejectClick(doc.id)} 
                    className="flex items-center justify-center rounded-xl border border-red-500/30 p-2 text-red-500 transition-colors hover:bg-red-500/10"
                    title="Reject Document"
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

      {/* REJECTION REASON MODAL */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1020] border border-[#E5E7EB] dark:border-[#1F2A44] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reject Submission</h3>
              <button 
                onClick={() => setRejectingDocId(null)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting this document. This feedback will be sent directly to the contributor.
            </p>
            
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Low quality scan, duplicate content, incorrect subject..."
              className="w-full h-32 p-3 text-sm rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-transparent text-gray-900 dark:text-white mb-6 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
            />
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectingDocId(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl dark:text-gray-300 dark:hover:bg-[#1F2A44] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={isRejecting || !rejectReason.trim()}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}