"use client";

import { useState, useRef } from "react";
import { Loader2, UploadCloud, XCircle, AlertCircle, FileText } from "lucide-react";
import { supabase, uploadWithProgress, UploadState } from "@/app/lib/api"; // Updated imports
import UploadProgressBar from "./UploadProgressBar"; // Added import

type DocumentData = {
  id: number;
  title: string;
  category: string;
  subject: string;
  module_id: number | null;
  rejection_reason?: string | null;
};

interface ResubmitModalProps {
  document: DocumentData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResubmitModal({ document, isOpen, onClose, onSuccess }: ResubmitModalProps) {
  // New Progress States
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category);
  const [newFile, setNewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadState("idle");
    setProgress(0);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category", category);
      formData.append("subject", document.subject);
      formData.append("module_id", document.module_id ? String(document.module_id) : "null");
      
      if (newFile) {
        formData.append("file", newFile);
      }

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/documents/${document.id}/resubmit`;

      // REPLACED standard fetch with uploadWithProgress
      await uploadWithProgress(
        endpoint,
        formData,
        session.access_token,
        (percent) => setProgress(percent),
        (state) => setUploadState(state)
      );

      // Give the user 1.5 seconds to see the green "Success" checkmark before closing
      setTimeout(() => {
        onSuccess();
        setUploadState("idle"); 
      }, 1500);

    } catch (err: any) {
      setUploadState("error");
      setError(err.message || "Something went wrong during resubmission.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#111827] dark:border dark:border-[#1F2A44]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Edit & Resubmit</h2>
          <button onClick={onClose} disabled={uploadState === "uploading" || uploadState === "processing"} className="text-[#64748B] hover:text-red-500 dark:text-[#94A3B8] disabled:opacity-50">
            <XCircle size={24} />
          </button>
        </div>

        {document.rejection_reason && (
          <div className="mb-6 flex gap-3 rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="shrink-0" size={20} />
            <div className="text-sm">
              <strong>Moderator Note:</strong>
              <p className="mt-1">{document.rejection_reason}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Document Title</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploadState !== "idle" && uploadState !== "error"} className="w-full rounded-xl border border-[#E5E7EB] bg-transparent p-3 outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white disabled:opacity-50" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={uploadState !== "idle" && uploadState !== "error"} className="w-full rounded-xl border border-[#E5E7EB] bg-transparent p-3 outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white disabled:opacity-50">
              <option value="notes">Notes</option>
              <option value="pyq">PYQ</option>
              <option value="syllabus">Syllabus</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Replace PDF (Optional)</label>
            <div 
              onClick={() => { if(uploadState === "idle" || uploadState === "error") fileInputRef.current?.click() }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#FAFAF9] p-6 transition-colors dark:border-[#1F2A44] dark:bg-[#0B1020] ${(uploadState === "idle" || uploadState === "error") ? "hover:border-amber-500 hover:bg-amber-50 dark:hover:border-amber-500/50" : "opacity-50 cursor-not-allowed"}`}
            >
              {newFile ? (
                <div className="flex flex-col items-center text-amber-600 dark:text-amber-500">
                  <FileText size={32} className="mb-2" />
                  <span className="text-sm font-medium">{newFile.name}</span>
                  <span className="text-xs opacity-70">Click to change</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-[#64748B] dark:text-[#94A3B8]">
                  <UploadCloud size={32} className="mb-2" />
                  <span className="text-sm">Click to upload a new PDF</span>
                </div>
              )}
              <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => setNewFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          {/* INJECTED PROGRESS BAR HERE */}
          <UploadProgressBar 
            state={uploadState} 
            progress={progress} 
            fileName={newFile?.name} 
            errorMessage={error || undefined} 
          />

          <button
            type="submit"
            disabled={uploadState === "uploading" || uploadState === "processing" || uploadState === "success"}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 p-3 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {(uploadState === "uploading" || uploadState === "processing") ? (
              <><Loader2 className="animate-spin" size={20} /> Processing...</>
            ) : "Submit Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}