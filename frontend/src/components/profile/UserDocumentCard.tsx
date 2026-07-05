"use client";

import React, { useState } from "react";
import { FileText, Eye, Download, AlertCircle, RefreshCw } from "lucide-react";
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
  
  // Extract analytics exactly how ProfileTabs calculates total impact
  const analytics = Array.isArray(item.document_analytics)
    ? item.document_analytics[0]
    : item.document_analytics;
  const views = analytics?.view_count || 0;
  const downloads = analytics?.download_count || 0;

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
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col transition-colors">
      {/* Top Row: Document Info & Stats */}
      <div className="flex items-start justify-between gap-4">
        
        {/* Left Side: Icon + Title/Status */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-foreground line-clamp-1">
              {title}
            </h3>
            <div className="text-sm text-muted flex items-center gap-1">
              <span className="uppercase">{subject}</span>
              <span>•</span>
              <span className={`${getStatusColor(rawStatus)} font-medium`}>
                {displayStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: View & Download Counts */}
        <div className="flex items-center gap-4 text-sm text-muted shrink-0 pt-1">
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>{views}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            <span>{downloads}</span>
          </div>
        </div>
      </div>

      {/* Rejected State UI (Inline Alert) */}
      {isRejected && (
        <div className="mt-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
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
            className="mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Edit & Resubmit
          </button>
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
