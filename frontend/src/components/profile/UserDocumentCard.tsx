import { useState } from "react";
import ResubmitModal from "@/components/ui/ResubmitModal"; // Verify this path
import { AlertCircle, RotateCw, FileText, Eye, Download } from "lucide-react";

export default function UserDocumentCard({ item, onRefresh }: { item: any, onRefresh: () => void }) {
  const [isResubmitOpen, setIsResubmitOpen] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <FileText size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
            <p className="text-xs text-[#64748B] truncate capitalize">
              {item.subject} • <span className={item.status === 'approved' ? 'text-emerald-600' : item.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}>{item.status}</span>
            </p>
          </div>
        </div>

        {/* Rejection State UI */}
        {item.status === "rejected" && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-500/10">
            <div className="flex items-start gap-2 text-red-800 dark:text-red-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-bold">Upload Rejected</span>
                <p className="mt-1 opacity-90">{item.rejection_reason || "Does not meet community guidelines."}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsResubmitOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-100 p-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
            >
              <RotateCw size={16} /> Edit & Resubmit
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs font-bold text-[#64748B] dark:text-[#94A3B8] sm:ml-auto ml-14 shrink-0">
        <span className="flex items-center gap-1.5"><Eye size={14} /> {item.document_analytics?.view_count || 0}</span>
        <span className="flex items-center gap-1.5"><Download size={14} /> {item.document_analytics?.download_count || 0}</span>
      </div>

      {/* Resubmission Modal */}
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