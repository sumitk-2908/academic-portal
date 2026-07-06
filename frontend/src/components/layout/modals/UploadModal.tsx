"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload } from "lucide-react";
import { ClientLayoutContext, SUBJECTS_LIST, isNonModuleSubject } from "@/app/hooks/useClientLayout";
import UploadProgressBar from "@/components/ui/UploadProgressBar";
import { InlineSpinner } from "@/components/layout/SharedLayouts";

export const UploadModal = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <Dialog.Root open={ctx.showUploadForm} onOpenChange={ctx.setShowUploadForm}>
    <Dialog.Portal>
      <Dialog.Overlay className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
      <Dialog.Content className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-[100] w-full max-w-lg translate-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Dialog.Title className="text-lg font-extrabold text-foreground">{ctx.isAdmin ? "Admin Database Upload" : "Student Contribution"}</Dialog.Title>
          <Dialog.Close asChild><button className="text-muted transition-opacity hover:opacity-80"><X size={20} /></button></Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">Upload a PDF document to the portal.</Dialog.Description>
        <form onSubmit={ctx.handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Subject</label>
              <select value={ctx.uploadSubject} onChange={(e) => ctx.setUploadSubject(e.target.value)} className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none">{SUBJECTS_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Module</label>
              <select value={ctx.uploadModule} onChange={(e) => ctx.setUploadModule(Number(e.target.value))} disabled={ctx.uploadCategory === "syllabus" || isNonModuleSubject(ctx.uploadSubject)} className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50">
                {[1, 2, 3, 4, 5].map(m => <option key={m} value={m}>Module {m}</option>)}
              </select>
            </div>
          </div>
          <div><label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Title</label><input required type="text" value={ctx.uploadTitle} onChange={(e) => ctx.setUploadTitle(e.target.value)} className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none" /></div>
          <div><label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Category</label><select value={ctx.uploadCategory} onChange={(e) => ctx.setUploadCategory(e.target.value)} className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none"><option value="notes">Notes</option><option value="pyq">PYQ</option><option value="syllabus">Syllabus</option></select></div>
          <div>
            <label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">File Upload</label>
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-hover p-6 transition-colors hover:border-primary/50 hover:bg-surface">
              <div className="text-center">
                <Upload className="mx-auto mb-2 size-6 text-muted" />
                <p className="text-sm font-semibold text-foreground">{ctx.file ? ctx.file.name : "Choose a PDF file or drag & drop it here"}</p>
                <p className="mt-1 text-xs text-muted">PDFs only (Max 10MB)</p>
              </div>
              <input required type="file" accept="application/pdf" onChange={(e) => ctx.setFile(e.target.files?.[0] || null)} className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" disabled={ctx.uploadState === "uploading" || ctx.uploadState === "processing"} />
            </div>
          </div>
          <UploadProgressBar state={ctx.uploadState} progress={ctx.uploadProgress} fileName={ctx.file?.name} errorMessage={ctx.uploadErrorMsg} />
          <button type="submit" disabled={ctx.uploadState === "uploading" || ctx.uploadState === "processing" || ctx.uploadState === "success"} className="motion-hover motion-active flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">{(ctx.uploadState === "uploading" || ctx.uploadState === "processing") ? <><InlineSpinner label="Processing upload" size={16} /> Processing</> : "Publish Resource"}</button>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
