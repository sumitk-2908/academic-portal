"use client";

import { useState } from "react";
import DocumentCard from "@/components/ui/DocumentCard";
import ResubmitModal from "@/components/ui/ResubmitModal"; 
import { AlertCircle, RotateCw, Clock } from "lucide-react";

export default function UserDocumentCard({ 
  item, 
  onRefresh,
  onDownload = () => {}, // Default no-op to prevent crashes if not yet passed from Profile
  onToggleBookmark = () => {},
  isBookmarked = false,
  onDelete
}: { 
  item: any; 
  onRefresh: () => void;
  onDownload?: (e: React.MouseEvent, doc: any) => void;
  onToggleBookmark?: (id: number) => void;
  isBookmarked?: boolean;
  onDelete?: (id: number) => void;
}) {
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);

  return (
    <div className="relative group h-full w-full">
      {/* 1. The Unified Base Card (Inherits the 3px subject border and strict tokens) */}
      <DocumentCard
        doc={item}
        isBookmarked={isBookmarked}
        isAdmin={!!onDelete}
        onDownload={onDownload}
        onToggleBookmark={onToggleBookmark}
        onDelete={onDelete}
      />

      {/* 2. Preserved Pending State Overlay */}
      {item.status === 'pending' && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-warning/90 backdrop-blur-md px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
          <Clock size={10} /> Pending
        </div>
      )}

      {/* 3. Preserved Rejection State UI (Frosted Glass Overlay) */}
      {item.status === 'rejected' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-surface/80 backdrop-blur-sm p-4 text-center border-[3px] border-destructive motion-hover">
          <AlertCircle className="mb-2 text-destructive" size={28} />
          <p className="text-sm font-bold text-foreground mb-1">Upload Rejected</p>
          
          <p className="text-xs text-muted mb-4 line-clamp-2 px-2">
            {item.rejection_reason || "Does not meet community guidelines."}
          </p>
          
          <button
            onClick={() => setIsResubmitOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground motion-hover motion-active hover:opacity-90 shadow-sm"
          >
            <RotateCw size={14} /> Edit & Resubmit
          </button>
        </div>
      )}

      {/* 4. Preserved Resubmit Modal Logic */}
      <ResubmitModal
        isOpen={isResubmitOpen}
        document={item}
        onClose={() => setIsResubmitOpen(false)}
        onSuccess={() => {
          setIsResubmitOpen(false);
          onRefresh(); // Trigger a refetch of the documents list
        }}
      />
    </div>
  );
}