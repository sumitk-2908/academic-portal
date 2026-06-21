"use client";

import { Loader2, UploadCloud, CheckCircle, AlertCircle, ServerCog } from "lucide-react";
import { UploadState } from "@/app/lib/api";

interface UploadProgressBarProps {
  state: UploadState;
  progress: number;
  fileName?: string;
  errorMessage?: string;
}

export default function UploadProgressBar({ state, progress, fileName, errorMessage }: UploadProgressBarProps) {
  if (state === "idle") return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] p-4 dark:border-[#1F2A44] dark:bg-[#0B1020]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Dynamic Icon based on state */}
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors
            ${state === "uploading" ? "bg-blue-500" : 
              state === "processing" ? "bg-amber-500" : 
              state === "success" ? "bg-emerald-500" : "bg-red-500"}`}
          >
            {state === "uploading" && <UploadCloud size={20} className="animate-pulse" />}
            {state === "processing" && <ServerCog size={20} className="animate-spin" />}
            {state === "success" && <CheckCircle size={20} />}
            {state === "error" && <AlertCircle size={20} />}
          </div>
          
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              {state === "uploading" && "Uploading Document..."}
              {state === "processing" && "Extracting Metadata & Processing..."}
              {state === "success" && "Upload Complete!"}
              {state === "error" && "Upload Failed"}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {state === "error" ? errorMessage : fileName || "Large PDFs may take a moment to process."}
            </p>
          </div>
        </div>
        
        {/* Progress Percentage */}
        {(state === "uploading" || state === "processing") && (
          <span className="text-sm font-black text-gray-900 dark:text-white">{progress}%</span>
        )}
      </div>

      {/* Progress Bar Track */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div 
          className={`h-full rounded-full transition-all duration-300 ease-out
            ${state === "error" ? "bg-red-500" : 
              state === "success" ? "bg-emerald-500" : 
              state === "processing" ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}