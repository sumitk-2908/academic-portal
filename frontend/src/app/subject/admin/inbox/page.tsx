"use client";

import { useEffect, useState } from "react";
import { supabase, updateDocumentStatus, deleteDocument, getFlaggedDocuments, dismissDocumentFlags } from "../../../lib/api";
import { Inbox, CheckCircle, Trash2, Eye, FileText, ArrowLeft, Loader2, X, Flag, ShieldAlert, MessageSquareWarning, Upload } from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Toast from "@radix-ui/react-toast";
import { requestUploadPrompt } from "@/app/lib/student-prompts";

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
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary motion-hover">
          <ArrowLeft size={14} /> Back to Hub
        </Link>

        <section className={`rounded-3xl border p-6 flex items-center gap-4 premium-transition ${activeTab === 'pending' ? 'bg-warning/5 border-warning/20' : 'bg-destructive/5 border-destructive/20'}`}>
          <div className={`h-12 w-12 rounded-xl text-primary-foreground flex items-center justify-center shrink-0 premium-transition ${activeTab === 'pending' ? 'bg-warning' : 'bg-destructive'}`}>
            {activeTab === 'pending' ? <Inbox size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Admin Moderation Hub</h1>
            <p className={`text-xs mt-0.5 font-semibold tracking-wider ${activeTab === 'pending' ? 'text-warning' : 'text-destructive'}`}>
              {activeTab === 'pending' ? 'Audit crowdsourced assets before deployment.' : 'Review community-flagged content for quality control.'}
            </p>
          </div>
        </section>

        {/* TABS */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-bold rounded-xl motion-hover motion-active ${activeTab === 'pending' ? 'bg-foreground text-background' : 'text-muted hover:bg-surface-hover'}`}
          >
            Pending Audits ({pendingDocs.length})
          </button>
          <button 
            onClick={() => setActiveTab('flagged')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl motion-hover motion-active ${activeTab === 'flagged' ? 'bg-destructive text-destructive-foreground' : 'text-muted hover:bg-destructive/10 hover:text-destructive'}`}
          >
            <Flag size={16} /> Flagged Content ({flaggedDocs.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* PENDING TAB RENDER */}
            {activeTab === 'pending' && pendingDocs.map(doc => {
              
              return (
                <article key={doc.id} className="flex flex-col rounded-2xl border border-warning/20 bg-surface p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="h-9 w-9 bg-warning/10 text-warning rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <span className="text-xs font-extrabold uppercase bg-warning/10 text-warning px-2.5 py-1 rounded-full tracking-wider">PENDING</span>
                  </div>
                  <h3 className="text-base font-bold mt-3 line-clamp-2 min-h-[2rem] text-foreground tracking-tight">{doc.title}</h3>
                  <p className="text-sm text-muted mt-2 font-semibold">{doc.subject} • Module {doc.module_id || 1}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {doc.resubmission_count > 0 && (
                      <span className="inline-flex items-center self-start rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary">
                        Resubmission (Attempt #{doc.resubmission_count})
                      </span>
                    )}

                    {doc.rejection_reason && (
                      <div className="text-xs text-muted italic bg-surface-hover p-2 rounded-lg border border-border">
                        <strong>Prior Rejection Note:</strong> "{doc.rejection_reason}"
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto flex gap-2 border-t border-border pt-4">
                    <a href={doc.file_url} target="_blank" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
                      <Eye size={12} /> View
                    </a>
                    <button onClick={() => handleApprove(doc.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2 text-sm font-bold text-white motion-hover motion-active hover:opacity-90">
                      <CheckCircle size={12} /> Apprv
                    </button>
                    <button onClick={() => handleRejectClick(doc.id)} className="flex items-center justify-center rounded-xl border border-destructive/30 p-2 text-destructive motion-hover motion-active hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}

            {/* FLAGGED TAB RENDER */}
            {activeTab === 'flagged' && flaggedDocs.map(doc => (
               <article key={doc.id} className="flex flex-col rounded-2xl border border-destructive/20 bg-surface p-4 shadow-sm">
                 <div className="flex justify-between items-start">
                   <div className="h-9 w-9 bg-destructive/10 text-destructive rounded-xl flex items-center justify-center shrink-0">
                     <ShieldAlert size={16} />
                   </div>
                   <span className="text-xs font-extrabold uppercase bg-destructive/10 text-destructive px-2.5 py-1 rounded-full flex items-center gap-1 tracking-wider">
                     {doc.flags?.length} Flags
                   </span>
                 </div>
                 <h3 className="text-base font-bold mt-3 line-clamp-2 min-h-[2rem] text-foreground tracking-tight">{doc.title}</h3>
                 <p className="text-sm text-muted mt-2 font-semibold">{doc.subject} • {doc.category}</p>
                 
                 <div className="mt-auto flex gap-2 border-t border-border pt-4">
                   <button onClick={() => setReviewingFlagsDoc(doc)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 text-destructive py-2 text-sm font-bold motion-hover motion-active hover:bg-destructive/20">
                     <MessageSquareWarning size={12} /> Review Flags
                   </button>
                 </div>
               </article>
            ))}

            {/* EMPTY STATES */}
            {activeTab === 'pending' && pendingDocs.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface-hover/50 p-8 text-center">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">Approval queue is clear</h2>
                <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-muted">Invite fresh notes when a subject needs another perspective.</p>
                <button onClick={requestUploadPrompt} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
                  <Upload size={15} /> Upload Notes
                </button>
              </div>
            )}
            {activeTab === 'flagged' && flaggedDocs.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface-hover/50 p-8 text-center">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">Flag review is clear</h2>
                <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-muted">Keep studying the latest uploads or review new submissions as they arrive.</p>
                <Link href="/recent-uploads" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
                  <Eye size={15} /> Start Studying
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- MODAL: REJECT DOCUMENT --- */}
        <Dialog.Root open={rejectingDocId !== null} onOpenChange={(open) => { if (!open) setRejectingDocId(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm motion-modal" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl bg-surface p-6 shadow-2xl motion-modal">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-xl font-bold text-foreground">Reject Document</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="text-muted hover:text-foreground motion-hover"><X size={20} /></button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="text-sm text-muted mb-4">
                Provide a reason for rejecting this document. It will be hidden from users.
              </Dialog.Description>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full h-32 p-3 text-sm rounded-xl border bg-background text-foreground mb-6 outline-none motion-focus focus:border-primary"
              />
              <div className="flex gap-3 justify-end">
                <Dialog.Close asChild><button className="px-4 py-2 text-sm font-bold rounded-xl bg-surface-hover motion-hover">Cancel</button></Dialog.Close>
                <button onClick={confirmReject} disabled={isRejecting || !rejectReason.trim()} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-destructive-foreground bg-destructive rounded-xl motion-hover motion-active hover:opacity-90 disabled:opacity-50">
                  {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirm Rejection
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* --- MODAL: REVIEW FLAGS --- */}
        <Dialog.Root open={reviewingFlagsDoc !== null} onOpenChange={(open) => { if (!open) setReviewingFlagsDoc(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm motion-modal" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-lg max-h-[85vh] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl bg-surface p-6 shadow-2xl border border-border motion-modal">
              <div className="flex justify-between items-center border-b pb-4 border-border">
                <div>
                  <Dialog.Title className="text-xl font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="text-destructive" /> Review Flags
                  </Dialog.Title>
                  <p className="text-xs text-muted mt-1 line-clamp-1">{reviewingFlagsDoc?.title[0]}</p>
                </div>
                <Dialog.Close asChild>
                  <button className="text-muted hover:text-foreground motion-hover"><X size={20} /></button>
                </Dialog.Close>
              </div>
              
              <div className="overflow-y-auto space-y-3 py-2 custom-scrollbar">
                {reviewingFlagsDoc?.flags?.map((flag: any, index: number) => (
                  <div key={index} className="bg-destructive/5 p-3 rounded-xl border border-destructive/10">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-destructive/10 text-destructive mb-2">
                      {flag.reason.replace('_', ' ')}
                    </span>
                    <p className="text-sm text-foreground">
                      {flag.description || <span className="italic text-muted">No additional details provided.</span>}
                    </p>
                    <p className="text-xs text-muted mt-2 text-right tabular-nums">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border shrink-0">
                <a href={reviewingFlagsDoc?.file_url} target="_blank" className="px-4 py-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl mr-auto motion-hover">
                  Open PDF
                </a>
                
                <button 
                  onClick={() => handleDismissFlags(reviewingFlagsDoc.id)}
                  disabled={isDismissing}
                  className="px-4 py-2 text-sm font-bold text-foreground bg-surface-hover hover:opacity-90 rounded-xl motion-hover disabled:opacity-50"
                >
                  {isDismissing ? <Loader2 size={16} className="animate-spin" /> : "Dismiss Flags (False Alarm)"}
                </button>
                
                <button 
                  onClick={() => {
                    setRejectingDocId(reviewingFlagsDoc.id);
                    setRejectReason(`Removed due to community reports: ${reviewingFlagsDoc.flags[0]?.reason}`);
                  }}
                  className="px-4 py-2 text-sm font-bold text-destructive-foreground bg-destructive hover:opacity-90 rounded-xl motion-hover"
                >
                  Reject & Remove Document
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Global Toast Error Handler */}
        <Toast.Root open={toast.open} onOpenChange={(open) => setToast(prev => ({...prev, open}))} className="bg-surface p-4 rounded-xl shadow-lg border border-border">
          <Toast.Title className={`text-sm font-bold ${toast.type === 'error' ? 'text-destructive' : 'text-success'}`}>
            {toast.type === 'error' ? 'Error' : 'Success'}
          </Toast.Title>
          <Toast.Description className="text-xs text-muted mt-1">{toast.message}</Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-0 right-0 z-50 p-6" />
      </main>
    </Toast.Provider>
  );
}
