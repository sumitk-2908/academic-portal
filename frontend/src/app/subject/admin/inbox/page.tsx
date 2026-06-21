"use client";

import { useEffect, useState } from "react";
import { supabase, updateDocumentStatus, deleteDocument, getFlaggedDocuments, dismissDocumentFlags } from "../../../lib/api";
import { Inbox, CheckCircle, Trash2, Eye, FileText, ArrowLeft, Loader2, X, Flag, ShieldAlert, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Toast from "@radix-ui/react-toast";

export default function AdminInboxAuditingRoute() {
  const [activeTab, setActiveTab] = useState<'pending' | 'flagged'>('pending');
  
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [flaggedDocs, setFlaggedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectingDocId, setRejectingDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  
  // New state for reviewing specific flags
  const [reviewingFlagsDoc, setReviewingFlagsDoc] = useState<any | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const [toast, setToast] = useState({ open: false, message: "", type: "error" });

  const loadInbox = async () => {
    setLoading(true);
    
    // Fetch Pending Approvals
    const { data: pending } = await supabase
      .from('documents')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (pending) setPendingDocs(pending);

    // Fetch Flagged Content
    const flagged = await getFlaggedDocuments();
    setFlaggedDocs(flagged);

    setLoading(false);
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleApprove = async (id: number) => {
    await updateDocumentStatus(id, 'approved');
    setPendingDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleRejectClick = (id: number) => {
    setRejectingDocId(id);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectingDocId) return;
    setIsRejecting(true);
    
    try {
      await updateDocumentStatus(rejectingDocId, 'rejected', rejectReason);
      
      // Remove from UI depending on which tab we are on
      setPendingDocs(prev => prev.filter(d => d.id !== rejectingDocId));
      setFlaggedDocs(prev => prev.filter(d => d.id !== rejectingDocId));
      
      setRejectingDocId(null);
      setReviewingFlagsDoc(null);
    } catch (error) {
      console.error("Rejection failed:", error);
      setToast({ open: true, message: "Failed to reject document. Please try again.", type: "error" });
    } finally {
      setIsRejecting(false);
      setRejectReason("");
    }
  };

  const handleDismissFlags = async (id: number) => {
    setIsDismissing(true);
    try {
      await dismissDocumentFlags(id);
      setFlaggedDocs(prev => prev.filter(d => d.id !== id));
      setReviewingFlagsDoc(null);
      setToast({ open: true, message: "Flags dismissed successfully.", type: "success" });
    } catch (error) {
      setToast({ open: true, message: "Failed to dismiss flags.", type: "error" });
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <Toast.Provider swipeDirection="right">
      <main className="mx-auto w-full max-w-6xl space-y-6 animate-fade-up pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
          <ArrowLeft size={14} /> Back to Hub
        </Link>

        <section className={`rounded-3xl border p-6 flex items-center gap-4 transition-colors ${activeTab === 'pending' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <div className={`h-12 w-12 rounded-xl text-white flex items-center justify-center shrink-0 transition-colors ${activeTab === 'pending' ? 'bg-amber-500' : 'bg-red-500'}`}>
            {activeTab === 'pending' ? <Inbox size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">Admin Moderation Hub</h1>
            <p className={`text-xs mt-0.5 ${activeTab === 'pending' ? 'text-amber-700 dark:text-amber-500' : 'text-red-700 dark:text-red-500'}`}>
              {activeTab === 'pending' ? 'Audit crowdsourced assets before deployment.' : 'Review community-flagged content for quality control.'}
            </p>
          </div>
        </section>

        {/* TABS */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'pending' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            Pending Audits ({pendingDocs.length})
          </button>
          <button 
            onClick={() => setActiveTab('flagged')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-colors ${activeTab === 'flagged' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20'}`}
          >
            <Flag size={16} /> Flagged Content ({flaggedDocs.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* PENDING TAB RENDER */}
            {activeTab === 'pending' && pendingDocs.map(doc => {
              
              return (
                <article key={doc.id} className="flex flex-col rounded-2xl border border-amber-500/20 bg-white p-4 shadow-sm dark:bg-[#111827]">
                  <div className="flex justify-between items-start">
                    <div className="h-9 w-9 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <span className="text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full">PENDING</span>
                  </div>
                  <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
                  <p className="text-[10px] text-[#64748B] mt-2 font-semibold">{doc.subject} • Module {doc.module_id || 1}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {doc.resubmission_count > 0 && (
                      <span className="inline-flex items-center self-start rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        Resubmission (Attempt #{doc.resubmission_count})
                      </span>
                    )}

                    {doc.rejection_reason && (
                      <div className="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                        <strong>Prior Rejection Note:</strong> "{doc.rejection_reason}"
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto flex gap-2 border-t border-[#E5E7EB] pt-4 dark:border-[#1F2A44]">
                    <a href={doc.file_url} target="_blank" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#4F46E5] py-2 text-[11px] font-bold text-white hover:bg-[#6366F1]">
                      <Eye size={12} /> View
                    </a>
                    <button onClick={() => handleApprove(doc.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-[11px] font-bold text-white hover:bg-emerald-600">
                      <CheckCircle size={12} /> Apprv
                    </button>
                    <button onClick={() => handleRejectClick(doc.id)} className="flex items-center justify-center rounded-xl border border-red-500/30 p-2 text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}

            {/* FLAGGED TAB RENDER */}
            {activeTab === 'flagged' && flaggedDocs.map(doc => (
               <article key={doc.id} className="flex flex-col rounded-2xl border border-red-500/20 bg-white p-4 shadow-sm dark:bg-[#111827]">
                 <div className="flex justify-between items-start">
                   <div className="h-9 w-9 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                     <ShieldAlert size={16} />
                   </div>
                   <span className="text-[9px] font-extrabold uppercase bg-red-500/10 text-red-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                     {doc.flags?.length} Flags
                   </span>
                 </div>
                 <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
                 <p className="text-[10px] text-[#64748B] mt-2 font-semibold">{doc.subject} • {doc.category}</p>
                 
                 <div className="mt-auto flex gap-2 border-t border-[#E5E7EB] pt-4 dark:border-[#1F2A44]">
                   <button onClick={() => setReviewingFlagsDoc(doc)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-red-600 py-2 text-[11px] font-bold hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400">
                     <MessageSquareWarning size={12} /> Review Flags
                   </button>
                 </div>
               </article>
            ))}

            {/* EMPTY STATES */}
            {activeTab === 'pending' && pendingDocs.length === 0 && (
              <p className="col-span-full text-center py-12 text-xs text-[#64748B]">Inbox clear! No outstanding crowdsourcing requests.</p>
            )}
            {activeTab === 'flagged' && flaggedDocs.length === 0 && (
              <p className="col-span-full text-center py-12 text-xs text-[#64748B]">No flagged content! The community is happy.</p>
            )}
          </div>
        )}

        {/* --- MODAL: REJECT DOCUMENT --- */}
        <Dialog.Root open={rejectingDocId !== null} onOpenChange={(open) => { if (!open) setRejectingDocId(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1020]">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-bold">Reject Document</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Provide a reason for rejecting this document. It will be hidden from users.
              </Dialog.Description>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full h-32 p-3 text-sm rounded-xl border bg-transparent mb-6 outline-none"
              />
              <div className="flex gap-3 justify-end">
                <Dialog.Close asChild><button className="px-4 py-2 text-sm font-bold rounded-xl">Cancel</button></Dialog.Close>
                <button onClick={confirmReject} disabled={isRejecting || !rejectReason.trim()} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-red-500 rounded-xl">
                  {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Rejection
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* --- MODAL: REVIEW FLAGS --- */}
        <Dialog.Root open={reviewingFlagsDoc !== null} onOpenChange={(open) => { if (!open) setReviewingFlagsDoc(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-lg max-h-[85vh] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#0B1020] dark:border dark:border-[#1F2A44]">
              <div className="flex justify-between items-center border-b pb-4 dark:border-gray-800">
                <div>
                  <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="text-red-500" /> Review Flags
                  </Dialog.Title>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{reviewingFlagsDoc?.title[0]}</p>
                </div>
                <Dialog.Close asChild>
                  <button className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </Dialog.Close>
              </div>
              
              <div className="overflow-y-auto space-y-3 py-2 custom-scrollbar">
                {reviewingFlagsDoc?.flags?.map((flag: any, index: number) => (
                  <div key={index} className="bg-red-50 dark:bg-red-500/5 p-3 rounded-xl border border-red-100 dark:border-red-500/10">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-400 mb-2">
                      {flag.reason.replace('_', ' ')}
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {flag.description || <span className="italic text-gray-400">No additional details provided.</span>}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-2 text-right">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t dark:border-gray-800 shrink-0">
                <a href={reviewingFlagsDoc?.file_url} target="_blank" className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl mr-auto dark:bg-indigo-500/10 dark:text-indigo-400">
                  Open PDF
                </a>
                
                <button 
                  onClick={() => handleDismissFlags(reviewingFlagsDoc.id)}
                  disabled={isDismissing}
                  className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl dark:bg-gray-800 dark:text-gray-300"
                >
                  {isDismissing ? <Loader2 size={16} className="animate-spin" /> : "Dismiss Flags (False Alarm)"}
                </button>
                
                <button 
                  onClick={() => {
                    setRejectingDocId(reviewingFlagsDoc.id);
                    // Pass the first flag reason as the default rejection reason
                    setRejectReason(`Removed due to community reports: ${reviewingFlagsDoc.flags[0]?.reason}`);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl"
                >
                  Reject & Remove Document
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Global Toast Error Handler */}
        <Toast.Root open={toast.open} onOpenChange={(open) => setToast(prev => ({...prev, open}))} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg border dark:border-gray-800">
          <Toast.Title className={`text-sm font-bold ${toast.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {toast.type === 'error' ? 'Error' : 'Success'}
          </Toast.Title>
          <Toast.Description className="text-xs text-gray-500 mt-1">{toast.message}</Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-0 right-0 z-50 p-6" />
      </main>
    </Toast.Provider>
  );
}