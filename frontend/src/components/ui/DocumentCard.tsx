"use client";

import Link from "next/link";
import { Download, Eye, Bookmark, Trash2, FileText, NotebookPen, FileQuestion, ListChecks } from "lucide-react";
import { SUBJECT_UI_MAP } from "@/app/lib/subject-config";

const CATEGORY_ICONS: Record<string, any> = { 
  notes: NotebookPen, 
  pyq: FileQuestion, 
  syllabus: ListChecks 
};

const getTimeAgo = (dateStr: string) => {
  const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};

export interface DocumentCardProps {
  doc: any;
  subjectSlug?: string;
  isBookmarked: boolean;
  isAdmin: boolean;
  onDownload: (e: React.MouseEvent, doc: any) => void;
  onToggleBookmark: (id: number) => void;
  onDelete?: (id: number) => void;
}

export default function DocumentCard({ 
  doc, 
  subjectSlug, 
  isBookmarked, 
  isAdmin, 
  onDownload, 
  onToggleBookmark, 
  onDelete 
}: DocumentCardProps) {
  
  const slug = subjectSlug || doc.subject?.toLowerCase().replace(/ /g, '-') || "default";
  const ui = SUBJECT_UI_MAP[slug] || SUBJECT_UI_MAP["default"];
  const accentBorderColor = ui.border ? ui.border.replace('border-', 'border-l-') : 'border-l-muted';
  
  const Icon = CATEGORY_ICONS[doc.category] || FileText;
  const targetSubjectSlug = subjectSlug || doc.subject?.toLowerCase().replace(/ /g, '-');

  return (
    <article className={`group flex flex-col rounded-2xl border border-border border-l-[3px] ${accentBorderColor} bg-surface p-5 shadow-sm motion-hover hover:-translate-y-1 hover:border-r-border hover:border-y-border hover:shadow-md`}>
      
      <div className="relative mb-4 h-32 w-full overflow-hidden rounded-xl bg-background flex items-center justify-center">
        {doc.thumbnail_url ? (
          <img src={doc.thumbnail_url} alt={`${doc.title} thumbnail`} className="object-cover object-top w-full h-full opacity-90 motion-hover group-hover:opacity-100" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <Icon size={32} className="opacity-50" />
          </div>
        )}
        {/* Helper Text / Badge: 11px, Extrabold, Wide Tracking */}
        <span className="absolute top-2 right-2 rounded-md bg-foreground/80 backdrop-blur-md px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-background shadow-sm">
          {doc.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Card Title: 16px, Bold, Tight Tracking */}
        <h3 className="text-xl font-bold tracking-tight leading-tight line-clamp-2 min-h-[2.5rem] text-foreground">
          {doc.title}
        </h3>
        
        <div className="mt-1 flex items-center gap-1.5">
          {/* Uploader Label: 11px, Bold, Wide Tracking */}
          <span className="text-xs font-bold uppercase tracking-wider text-primary truncate">
            {doc.uploader_name || 'Anonymous'}
          </span>
        </div>
        
        {/* Metadata Layer: 12px, Medium, Tabular Numbers for perfect decimal/date alignment */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-medium tabular-nums text-muted">
          <span>{doc.page_count ? `${doc.page_count} pgs` : 'PDF'}</span>
          <span>·</span>
          <span>{doc.file_size ? `${doc.file_size.toFixed(1)} MB` : 'N/A'}</span>
          <span>·</span>
          <span>{getTimeAgo(doc.created_at)}</span>
        </div>
      </div>
      
      <div className="mt-4 flex gap-2 border-t border-border pt-4">
        <button onClick={(e) => onDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-hover py-2 text-sm font-bold text-foreground motion-hover motion-active hover:border-primary/50">
          <Download size={13} /> DL
        </button>
        
        <Link href={`/subject/${targetSubjectSlug}/module-${doc.module_id || 1}/${doc.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-transparent bg-primary py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
          <Eye size={13} /> View
        </Link>
        
        <button onClick={() => onToggleBookmark(doc.id)} className={`rounded-xl border p-2 motion-hover motion-active ${isBookmarked ? "bg-warning border-warning text-white" : "border-warning text-warning hover:bg-warning/10"}`}>
          <Bookmark size={14} className={isBookmarked ? "fill-white text-white" : "text-warning"} />
        </button>
        
        {isAdmin && onDelete && (
          <button onClick={() => onDelete(doc.id)} className="rounded-xl border border-destructive/30 p-2 text-destructive motion-hover motion-active hover:bg-destructive/10">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </article>
  );
}