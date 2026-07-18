"use client";

import React, { useState } from "react";
import { FileText, Eye, Download, AlertCircle, RefreshCw, ThumbsUp } from "lucide-react";
import ResubmitModal from "@/components/ui/ResubmitModal";
import type { DocumentWithAnalytics } from "@/app/lib/document-types";

interface UserDocumentCardProps {
  item: DocumentWithAnalytics;
  onRefresh: () => void;
}

export const UserDocumentCard: React.FC<UserDocumentCardProps> = ({
  item,
  onRefresh,
}) => {
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);

  // Safely extract values from the item prop passed by ProfileTabs
  const title = item?.title || "Untitled Document";
  const subject = item?.subject || "Unknown";
  
  // Normalize the status string for consistent rendering
  const rawStatus = item?.status || "pending";
  const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
  const isRejected = rawStatus.toLowerCase() === "rejected";
  
  const rejectReason = item?.rejection_reason || "Does not meet community guidelines.";
  
  const revisions = Array.isArray((item as any).document_revisions) 
    ? (item as any).document_revisions 
    : [];
  const pastRejections = revisions
    .filter((r: any) => r.status === 'rejected')
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  const analytics = Array.isArray(item.document_analytics)
    ? item.document_analytics[0]
    : item.document_analytics;
  const views = analytics?.view_count || 0;
  const downloads = analytics?.download_count || 0;
  const upvotes = analytics?.upvotes || 0;

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "pending":
        return "text-warning";
      case "approved":
        return "text-success";
      case "rejected":
        return "text-destructive";
      default:
        return "text-muted";
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors">
      {/* Top Row: Document Info & Stats */}
      <div className="flex items-start justify-between gap-4">
        
        {/* Left Side: Icon + Title/Status */}
        <div className="flex items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="line-clamp-1 text-base font-semibold text-foreground">
              {title}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted">
              <span className="uppercase">{subject}</span>
              <span>•</span>
              <span className={`${getStatusColor(rawStatus)} font-medium`}>
                {displayStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: View & Download & Upvote Counts */}
        <div className="flex shrink-0 items-center gap-4 pt-1 text-sm text-muted">
          <div className="flex items-center gap-1.5" title="Views">
            <Eye className="size-4" />
            <span>{views}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Downloads">
            <Download className="size-4" />
            <span>{downloads}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Upvotes">
            <ThumbsUp className="size-4" />
            <span>{upvotes}</span>
          </div>
        </div>
      </div>

      {/* Rejected State & History */}
      {(isRejected || pastRejections.length > 0) && (
        <div className={`mt-4 flex flex-col gap-3 rounded-lg border p-4 ${isRejected ? 'border-destructive/20 bg-destructive/10' : 'border-warning/20 bg-warning/5'}`}>
          {isRejected && (
            <>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="size-4" />
                <span className="text-sm font-semibold">Upload Rejected</span>
              </div>
              
              <p className="text-sm text-destructive/80">
                {rejectReason}
              </p>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsResubmitOpen(true);
                }}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-destructive/20 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/30"
              >
                <RefreshCw className="size-4" />
                Edit & Resubmit
              </button>
            </>
          )}

          {!isRejected && pastRejections.length > 0 && (
            <div className="flex items-center gap-2 text-warning">
              <RefreshCw className="size-4" />
              <span className="text-sm font-semibold">Previously Rejected (Now {displayStatus})</span>
            </div>
          )}

          {pastRejections.length > (isRejected ? 1 : 0) && (
            <div className={`space-y-2 ${isRejected ? "mt-2 border-t border-destructive/20 pt-3" : ""}`}>
              {isRejected && <span className="text-xs font-bold uppercase tracking-wider text-destructive/70">Previous Rejections</span>}
              {pastRejections.slice(isRejected ? 1 : 0).map((rej: any, idx: number) => (
                <div key={idx} className={`text-xs ${isRejected ? 'text-destructive/70' : 'text-warning/80'}`}>
                  <span className="font-semibold">{new Date(rej.created_at).toLocaleDateString()}</span> - {rej.rejection_reason || 'No reason provided'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preserved Resubmit Modal Logic */}
      <ResubmitModal
        isOpen={isResubmitOpen}
        document={item}
        onClose={() => setIsResubmitOpen(false)}
        onSuccess={() => {
          setIsResubmitOpen(false);
          onRefresh(); 
        }}
      />
    </div>
  );
};

// Fallback default export just in case it is ever imported without curly braces
export default UserDocumentCard;
