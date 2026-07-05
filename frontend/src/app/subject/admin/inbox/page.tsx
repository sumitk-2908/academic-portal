"use client";

import { useEffect, useState } from "react";
import { supabase, updateDocumentStatus, deleteDocument, getFlaggedDocuments, dismissDocumentFlags } from "../../../lib/api";
import { Inbox, CheckCircle, Trash2, Eye, FileText, ArrowLeft, X, Flag, ShieldAlert, MessageSquareWarning, Upload } from "lucide-react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Toast from "@radix-ui/react-toast";
import { requestUploadPrompt } from "@/app/lib/student-prompts";
import { DocumentGridSkeleton, InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function AdminInboxAuditingContent() {
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
      <main className="animate-fade-up mx-auto w-full max-w-6xl space-y-6 pb-12">
        <Link href="/" className="motion-hover inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary">
          <ArrowLeft size={14} /> Back to Hub
        </Link>

        <section className={`premium-transition flex items-center gap-4 rounded-3xl border p-6 ${activeTab === 'pending' ? 'border-warning/20 bg-warning/5' : 'border-destructive/20 bg-destructive/5'}`}>
          <div className={`premium-transition flex size-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground ${activeTab === 'pending' ? 'bg-warning' : 'bg-destructive'}`}>
            {activeTab === 'pending' ? <Inbox size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Admin Moderation Hub</h1>
            <p className={`mt-0.5 text-xs font-semibold tracking-wider ${activeTab === 'pending' ? 'text-warning' : 'text-destructive'}`}>
              {activeTab === 'pending' ? 'Audit crowdsourced assets before deployment.' : 'Review community-flagged content for quality control.'}
            </p>
          </div>
        </section>

        {/* TABS */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`motion-hover motion-active rounded-xl px-4 py-2 text-sm font-bold ${activeTab === 'pending' ? 'bg-foreground text-background' : 'text-muted hover:bg-surface-hover'}`}
          >
            Pending Audits ({pendingDocs.length})
          </button>
          <button 
            onClick={() => setActiveTab('flagged')}
            className={`motion-hover motion-active flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${activeTab === 'flagged' ? 'bg-destructive text-destructive-foreground' : 'text-muted hover:bg-destructive/10 hover:text-destructive'}`}
          >
            <Flag size={16} /> Flagged Content ({flaggedDocs.length})
          </button>
        </div>

        {loading ? (
          <DocumentGridSkeleton count={6} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* PENDING TAB RENDER */}
            {activeTab === 'pending' && pendingDocs.map(doc => {
              
              return (
                <article key={doc.id} className="flex flex-col rounded-2xl border border-warning/20 bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                      <FileText size={16} />
                    </div>
                    <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-extrabold tracking-wider text-warning uppercase">PENDING</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 min-h-[2rem] text-base font-bold tracking-tight text-foreground">{doc.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-muted">{doc.subject} • Module {doc.module_id || 1}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {doc.resubmission_count > 0 && (
                      <span className="inline-flex items-center self-start rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary">
                        Resubmission (Attempt #{doc.resubmission_count})
                      </span>
                    )}

                    {doc.rejection_reason && (
                      <div className="rounded-lg border border-border bg-surface-hover p-2 text-xs text-muted italic">
                        <strong>Prior Rejection Note:</strong> "{doc.rejection_reason}"
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto flex gap-2 border-t border-border pt-4">
                    <a href={doc.file_url} target="_blank" className="motion-hover motion-active flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                      <Eye size={12} /> View
                    </a>
                    <button onClick={() => handleApprove(doc.id)} className="motion-hover motion-active flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2 text-sm font-bold text-white hover:opacity-90">
                      <CheckCircle size={12} /> Apprv
                    </button>
                    <button onClick={() => handleRejectClick(doc.id)} className="motion-hover motion-active flex items-center justify-center rounded-xl border border-destructive/30 p-2 text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}

            {/* FLAGGED TAB RENDER */}
            {activeTab === 'flagged' && flaggedDocs.map(doc => (
               <article key={doc.id} className="flex flex-col rounded-2xl border border-destructive/20 bg-surface p-4 shadow-sm">
                 <div className="flex items-start justify-between">
                   <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                     <ShieldAlert size={16} />
                   </div>
                   <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-extrabold tracking-wider text-destructive uppercase">
                     {doc.flags?.length} Flags
                   </span>
                 </div>
                 <h3 className="mt-3 line-clamp-2 min-h-[2rem] text-base font-bold tracking-tight text-foreground">{doc.title}</h3>
                 <p className="mt-2 text-sm font-semibold text-muted">{doc.subject} • {doc.category}</p>
                 
                 <div className="mt-auto flex gap-2 border-t border-border pt-4">
                   <button onClick={() => setReviewingFlagsDoc(doc)} className="motion-hover motion-active flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/10 py-2 text-sm font-bold text-destructive hover:bg-destructive/20">
                     <MessageSquareWarning size={12} /> Review Flags
                   </button>
                 </div>
               </article>
            ))}

            {/* EMPTY STATES */}
            {activeTab === 'pending' && pendingDocs.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface-hover/50 p-8 text-center">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">Approval queue is clear</h2>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 font-medium text-muted">Invite fresh notes when a subject needs another perspective.</p>
                <button onClick={requestUploadPrompt} className="motion-hover motion-active mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                  <Upload size={15} /> Upload Notes
                </button>
              </div>
            )}
            {activeTab === 'flagged' && flaggedDocs.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface-hover/50 p-8 text-center">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">Flag review is clear</h2>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 font-medium text-muted">Keep studying the latest uploads or review new submissions as they arrive.</p>
                <Link href="/recent-uploads" className="motion-hover motion-active mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                  <Eye size={15} /> Start Studying
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- MODAL: REJECT DOCUMENT --- */}
        <Dialog.Root open={rejectingDocId !== null} onOpenChange={(open) => { if (!open) setRejectingDocId(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="motion-modal fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="motion-modal fixed top-[50%] left-[50%] z-50 grid w-full max-w-md translate-[-50%] gap-4 rounded-2xl bg-surface p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-xl font-bold text-foreground">Reject Document</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="motion-hover text-muted hover:text-foreground"><X size={20} /></button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="mb-4 text-sm text-muted">
                Provide a reason for rejecting this document. It will be hidden from users.
              </Dialog.Description>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="motion-focus mb-6 h-32 w-full rounded-xl border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild><button className="motion-hover rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold">Cancel</button></Dialog.Close>
                <button onClick={confirmReject} disabled={isRejecting || !rejectReason.trim()} className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-bold text-destructive-foreground hover:opacity-90 disabled:opacity-50">
                  {isRejecting ? <InlineSpinner label="Rejecting document" size={16} /> : <Trash2 className="size-4" />} Confirm Rejection
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* --- MODAL: REVIEW FLAGS --- */}
        <Dialog.Root open={reviewingFlagsDoc !== null} onOpenChange={(open) => { if (!open) setReviewingFlagsDoc(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="motion-modal fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="motion-modal fixed top-[50%] left-[50%] z-50 flex max-h-[85vh] w-full max-w-lg translate-[-50%] flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-foreground">
                    <ShieldAlert className="text-destructive" /> Review Flags
                  </Dialog.Title>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">{reviewingFlagsDoc?.title[0]}</p>
                </div>
                <Dialog.Close asChild>
                  <button className="motion-hover text-muted hover:text-foreground"><X size={20} /></button>
                </Dialog.Close>
              </div>
              
              <div className="custom-scrollbar space-y-3 overflow-y-auto py-2">
                {reviewingFlagsDoc?.flags?.map((flag: any, index: number) => (
                  <div key={index} className="rounded-xl border border-destructive/10 bg-destructive/5 p-3">
                    <span className="mb-2 inline-block rounded bg-destructive/10 px-2 py-0.5 text-xs font-bold tracking-wider text-destructive uppercase">
                      {flag.reason.replace('_', ' ')}
                    </span>
                    <p className="text-sm text-foreground">
                      {flag.description || <span className="text-muted italic">No additional details provided.</span>}
                    </p>
                    <p className="mt-2 text-right text-xs text-muted tabular-nums">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-border pt-4">
                <a href={reviewingFlagsDoc?.file_url} target="_blank" className="motion-hover mr-auto rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20">
                  Open PDF
                </a>
                
                <button 
                  onClick={() => handleDismissFlags(reviewingFlagsDoc.id)}
                  disabled={isDismissing}
                  className="motion-hover rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold text-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {isDismissing ? <InlineSpinner label="Dismissing flags" size={16} /> : "Dismiss Flags (False Alarm)"}
                </button>
                
                <button 
                  onClick={() => {
                    setRejectingDocId(reviewingFlagsDoc.id);
                    setRejectReason(`Removed due to community reports: ${reviewingFlagsDoc.flags[0]?.reason}`);
                  }}
                  className="motion-hover rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground hover:opacity-90"
                >
                  Reject & Remove Document
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Global Toast Error Handler */}
        <Toast.Root open={toast.open} onOpenChange={(open) => setToast(prev => ({...prev, open}))} className="rounded-xl border border-border bg-surface p-4 shadow-lg">
          <Toast.Title className={`text-sm font-bold ${toast.type === 'error' ? 'text-destructive' : 'text-success'}`}>
            {toast.type === 'error' ? 'Error' : 'Success'}
          </Toast.Title>
          <Toast.Description className="mt-1 text-xs text-muted">{toast.message}</Toast.Description>
        </Toast.Root>
        <Toast.Viewport className="fixed right-0 bottom-0 z-50 p-6" />
      </main>
    </Toast.Provider>
  );
}

export default function AdminInboxAuditingRoute() {
  return (
    <ErrorBoundary
      title="Admin dashboard could not load"
      message="The moderation dashboard ran into a problem. Retry this section without losing access to the rest of the app."
    >
      <AdminInboxAuditingContent />
    </ErrorBoundary>
  );
}
