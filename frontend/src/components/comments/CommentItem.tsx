"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, MessageSquare, Edit2, Trash2, Flag, Pin } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "@/app/context/AuthContext";
import { CommentInput } from "./CommentInput";
import { updateComment, deleteComment, adminDeleteComment, flagComment, adminPinComment } from "@/app/lib/api/comments";
import { dispatchToast as showToast } from "@/app/lib/toast";

interface CommentData {
  id: string;
  document_id: number;
  user_id: string;
  content: string;
  parent_id: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_by_admin: boolean;
  deleted_reason: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string | null, avatar_url: string | null } | null;
  children?: CommentData[];
}

interface CommentItemProps {
  comment: CommentData;
  documentId: number;
  depth?: number;
  onRefresh: () => void;
  onReplyPrompt?: () => void;
}

type CommentDialog = "delete" | "report" | "admin-delete" | null;
type CommentFlagReason = "incorrect" | "duplicate" | "low_quality" | "other";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const IS_URL_PATTERN = /^(https?:\/\/[^\s]+)$/;

const renderInlineText = (text: string, keyPrefix: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const segments = text.split(URL_PATTERN);

  segments.forEach((segment, index) => {
    if (!segment) return;
    const key = `${keyPrefix}-${index}`;
    if (IS_URL_PATTERN.test(segment)) {
      nodes.push(
        <a key={key} href={segment} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {segment}
        </a>
      );
    } else if (segment.startsWith("**") && segment.endsWith("**") && segment.length > 4) {
      nodes.push(<strong key={key}>{segment.slice(2, -2)}</strong>);
    } else if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 2) {
      nodes.push(<code key={key} className="rounded bg-muted/20 px-1 py-0.5 text-primary">{segment.slice(1, -1)}</code>);
    } else {
      nodes.push(segment);
    }
  });

  return nodes;
};

// Safe, intentionally small markdown renderer. React escapes text nodes for us.
const renderMarkdown = (text: string) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      currentList.push(<li key={`li-${i}`}>{renderInlineText(trimmed.substring(2), `li-${i}`)}</li>);
    } else {
      if (currentList.length > 0) {
        elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 my-1 space-y-1">{currentList}</ul>);
        currentList = [];
      }
      if (trimmed !== '') {
         elements.push(<p key={`p-${i}`} className="my-1 whitespace-pre-wrap">{renderInlineText(line, `p-${i}`)}</p>);
      }
    }
  });

  if (currentList.length > 0) {
    elements.push(<ul key={`ul-end`} className="list-disc pl-5 my-1 space-y-1">{currentList}</ul>);
  }

  return elements;
};

export const CommentItem = ({ comment, documentId, depth = 0, onRefresh, onReplyPrompt }: CommentItemProps) => {
  const { userId, isAdmin } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDialog, setActiveDialog] = useState<CommentDialog>(null);
  const [reportReason, setReportReason] = useState<CommentFlagReason>("other");
  const [reportDescription, setReportDescription] = useState("");
  const [adminDeleteReason, setAdminDeleteReason] = useState("");
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);

  const isOwner = !!userId && comment.user_id === userId;

  const handleReplySubmit = async (content: string) => {
    const { postComment } = await import("@/app/lib/api/comments");
    await postComment(documentId, content, comment.id);
    setIsReplying(false);
    onRefresh();
  };

  const handleEditSubmit = async (content: string) => {
    await updateComment(comment.id, content);
    setIsEditing(false);
    onRefresh();
  };

  const handleDelete = async () => {
    setIsDialogSubmitting(true);
    try {
      await deleteComment(comment.id);
      showToast("Comment Deleted", "Your comment was removed.", "success");
      setActiveDialog(null);
      onRefresh();
    } catch (e: any) {
      showToast("Delete Failed", e.message || "Could not delete this comment.", "error");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleAdminDelete = async () => {
    if (!adminDeleteReason.trim()) return;
    setIsDialogSubmitting(true);
    try {
      await adminDeleteComment(comment.id, adminDeleteReason.trim());
      showToast("Comment Moderated", "Comment deleted by admin.", "success");
      setAdminDeleteReason("");
      setActiveDialog(null);
      onRefresh();
    } catch (e: any) {
      showToast("Moderation Failed", e.message || "Could not moderate this comment.", "error");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleFlag = async () => {
    setIsDialogSubmitting(true);
    try {
      await flagComment(comment.id, reportReason, reportDescription.trim() || undefined);
      showToast("Comment Reported", "Thank you for helping keep the discussion useful.", "success");
      setReportReason("other");
      setReportDescription("");
      setActiveDialog(null);
    } catch (e: any) {
      showToast("Notice", e.message, "error");
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleTogglePin = async () => {
    await adminPinComment(comment.id, !comment.is_pinned);
    onRefresh();
  };

  const nameInitial = comment.profiles?.full_name?.charAt(0).toUpperCase() || "?";
  
  const TRUNCATE_LIMIT = 250;
  const isLong = comment.content.length > TRUNCATE_LIMIT;
  const displayContent = (!isExpanded && isLong) ? comment.content.slice(0, TRUNCATE_LIMIT) + '...' : comment.content;

  // Max visual indentation to prevent squishing on mobile
  const indentClass = depth === 0 ? "" : depth === 1 ? "ml-4 sm:ml-8 border-l-2 border-border pl-4" : depth === 2 ? "ml-4 sm:ml-6 border-l-2 border-border pl-4" : "ml-2 sm:ml-4 border-l-2 border-border pl-2";

  if (comment.is_deleted || comment.deleted_by_admin) {
    return (
      <div className={`py-3 ${indentClass}`}>
        <div className="rounded-xl border border-border/50 bg-surface-hover/50 p-4 text-sm text-muted">
          {comment.deleted_by_admin ? (
            <div className="flex items-center gap-2">
              <Flag size={14} className="text-destructive" />
              <span>[This comment was removed by a moderator: {comment.deleted_reason}]</span>
            </div>
          ) : (
            <span>[This comment was deleted by the user]</span>
          )}
        </div>
        {comment.children && comment.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.children.map(child => (
              <CommentItem key={child.id} comment={child} documentId={documentId} depth={Math.min(depth + 1, 4)} onRefresh={onRefresh} onReplyPrompt={onReplyPrompt} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`py-3 ${indentClass}`}>
      <div className={`group relative rounded-xl border p-4 transition-colors ${comment.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface hover:border-border-hover'}`}>
        {comment.is_pinned && (
          <div className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <Pin size={10} /> PINNED
          </div>
        )}
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {nameInitial}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">
                {comment.profiles?.full_name || "Unknown Student"}
              </span>
              <span className="text-xs font-medium text-muted" title={new Date(comment.created_at).toLocaleString()}>
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                {comment.updated_at !== comment.created_at && " (edited)"}
              </span>
            </div>
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="motion-hover rounded-lg p-1.5 text-muted opacity-0 hover:bg-surface-hover hover:text-foreground group-hover:opacity-100 focus:opacity-100">
              <MoreHorizontal size={16} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="animate-in fade-in zoom-in-95 motion-dropdown z-50 min-w-[140px] rounded-xl border border-border bg-surface p-1 shadow-lg" align="end">
                <DropdownMenu.Item onClick={() => setActiveDialog("report")} className="motion-hover flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm font-semibold text-foreground hover:bg-surface-hover">
                  <Flag size={14} /> Report
                </DropdownMenu.Item>
                {isOwner && (
                  <>
                    <DropdownMenu.Item onClick={() => setIsEditing(true)} className="motion-hover flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm font-semibold text-foreground hover:bg-surface-hover">
                      <Edit2 size={14} /> Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setActiveDialog("delete")} className="motion-hover flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} /> Delete
                    </DropdownMenu.Item>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item onClick={handleTogglePin} className="motion-hover flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm font-semibold text-primary hover:bg-primary/10">
                      <Pin size={14} /> {comment.is_pinned ? "Unpin" : "Pin to Top"}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => setActiveDialog("admin-delete")} className="motion-hover flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} /> Mod Delete
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="mt-3 text-sm leading-relaxed text-foreground/90">
          {isEditing ? (
            <CommentInput 
              documentId={documentId} 
              parentId={comment.parent_id || undefined}
              onSubmit={handleEditSubmit} 
              onCancel={() => setIsEditing(false)}
              autoFocus
            />
          ) : (
            <>
              {renderMarkdown(displayContent)}
              {isLong && !isExpanded && (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="mt-1 font-bold text-primary hover:underline"
                >
                  Read more
                </button>
              )}
            </>
          )}
        </div>

        {!isEditing && depth < 2 && (
          <div className="mt-3 flex items-center gap-4">
            <button 
              onClick={() => {
                if (onReplyPrompt) onReplyPrompt();
                setIsReplying(!isReplying);
              }}
              className="motion-hover motion-active flex items-center gap-1.5 text-xs font-bold text-muted hover:text-foreground"
            >
              <MessageSquare size={14} /> Reply
            </button>
          </div>
        )}

        {isReplying && (
          <div className="mt-4">
            <CommentInput 
              documentId={documentId} 
              parentId={comment.id}
              onSubmit={handleReplySubmit}
              onCancel={() => setIsReplying(false)}
              autoFocus
              placeholder="Write a reply..."
            />
          </div>
        )}
      </div>

      {comment.children && comment.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.children.map(child => (
            <CommentItem 
              key={child.id} 
              comment={child} 
              documentId={documentId} 
              depth={Math.min(depth + 1, 4)} 
              onRefresh={onRefresh} 
              onReplyPrompt={onReplyPrompt}
            />
          ))}
        </div>
      )}

      <Dialog.Root open={activeDialog !== null} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="motion-modal fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="motion-modal fixed top-[50%] left-[50%] z-[100] w-[calc(100vw-2rem)] max-w-md translate-[-50%] rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <Dialog.Title className="text-lg font-extrabold text-foreground">
              {activeDialog === "delete" && "Delete comment"}
              {activeDialog === "report" && "Report comment"}
              {activeDialog === "admin-delete" && "Remove comment"}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-muted">
              {activeDialog === "delete" && "This removes your comment from the discussion. Replies will stay visible."}
              {activeDialog === "report" && "Tell moderators what makes this comment unhelpful or unsafe."}
              {activeDialog === "admin-delete" && "Add the moderation reason that should be shown in the thread."}
            </Dialog.Description>

            {activeDialog === "report" && (
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-[0.06em] text-muted" htmlFor={`report-reason-${comment.id}`}>Reason</label>
                <select
                  id={`report-reason-${comment.id}`}
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value as CommentFlagReason)}
                  className="motion-focus w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="incorrect">Incorrect or misleading</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="low_quality">Low quality</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  placeholder="Add context for the moderators..."
                  className="motion-focus min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            )}

            {activeDialog === "admin-delete" && (
              <textarea
                value={adminDeleteReason}
                onChange={(event) => setAdminDeleteReason(event.target.value)}
                placeholder="Reason shown to students..."
                className="motion-focus mt-4 min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="motion-hover motion-active rounded-xl bg-surface-hover px-4 py-2 text-sm font-bold text-foreground">Cancel</button>
              </Dialog.Close>
              {activeDialog === "delete" && (
                <button type="button" onClick={handleDelete} disabled={isDialogSubmitting} className="motion-hover motion-active rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50">
                  Delete
                </button>
              )}
              {activeDialog === "report" && (
                <button type="button" onClick={handleFlag} disabled={isDialogSubmitting} className="motion-hover motion-active rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  Submit report
                </button>
              )}
              {activeDialog === "admin-delete" && (
                <button type="button" onClick={handleAdminDelete} disabled={isDialogSubmitting || !adminDeleteReason.trim()} className="motion-hover motion-active rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50">
                  Remove comment
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};
