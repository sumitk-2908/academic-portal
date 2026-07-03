"use client";

import { useState, useEffect, useRef } from "react";
import { Edit, GraduationCap, BookOpen, X, Flame, Loader2 } from "lucide-react";
import { getProfilePreferences, updateProfilePreferences } from "@/app/lib/api";

export default function ProfileHeader({ user, streak }: { user: any, streak?: any }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const name = user?.user_metadata?.full_name || "Student User";
  const email = user?.email || "No email provided";
  const avatarUrl = user?.user_metadata?.avatar_url;
  
  // Preference States
  const [branch, setBranch] = useState("");
  const [subjectsStr, setSubjectsStr] = useState("");

  // Refs for Focus Management
  const modalRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const getInitials = (fullName: string) => fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const currentStreak = streak?.current_streak || 0;

  // Fetch existing preferences when modal opens
  useEffect(() => {
    if (isEditModalOpen && user?.id) {
      getProfilePreferences(user.id).then(data => {
        if (data) {
          setBranch(data.preferred_branch || "");
          setSubjectsStr(data.favorite_subjects?.join(", ") || "");
        }
      });
    }
  }, [isEditModalOpen, user?.id]);

  // Focus Trap and Accessibility Keyboard Listeners
  useEffect(() => {
    if (!isEditModalOpen) {
      // Restore focus to the trigger button when modal closes
      editButtonRef.current?.focus();
      return;
    }

    const modalElement = modalRef.current;
    if (!modalElement) return;

    // Select all focusable elements inside the modal
    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element (Close button) when modal opens
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Escape key to close
      if (e.key === 'Escape') {
        setIsEditModalOpen(false);
        return;
      }

      // 2. Focus trapping on Tab
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const favorite_subjects = subjectsStr.split(",").map(s => s.trim()).filter(s => s !== "");
      await updateProfilePreferences(user.id, {
        preferred_branch: branch,
        favorite_subjects
      });
      setIsEditModalOpen(false);
    } catch (error) {
      alert("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-20 w-20 sm:h-14 sm:w-14 shrink-0 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="flex h-20 w-20 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-sm">
              {getInitials(name)}
            </div>
          )}

          <div className="flex-1 min-w-0 w-full flex flex-col items-center sm:items-start">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-1 sm:mb-0.5">
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">{name}</h1>
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-orange-500">
                  <Flame size={12} fill="currentColor" aria-hidden="true"/>
                  {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <p className="text-sm font-medium text-muted mb-3">{email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 text-sm font-medium text-muted">
              <span className="flex items-center gap-1.5"><GraduationCap size={14} aria-hidden="true"/> {branch || "Academic Portal"}</span>
              <span className="flex items-center gap-1.5"><BookOpen size={14} aria-hidden="true"/> Student Account</span>
            </div>
          </div>
          <button 
            ref={editButtonRef}
            onClick={() => setIsEditModalOpen(true)}
            className="mt-3 flex w-full sm:mt-0 sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-muted motion-hover motion-active hover:bg-surface-hover"
          >
            <Edit size={14} aria-hidden="true"/> Edit Profile
          </button>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm motion-modal animate-in fade-in">
          <div 
            ref={modalRef}
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="edit-profile-title"
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-border motion-modal"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="edit-profile-title" className="text-xl font-bold tracking-tight text-foreground">Personalize Profile</h2>
              <button 
                aria-label="Close modal"
                onClick={() => setIsEditModalOpen(false)} 
                className="text-muted hover:text-foreground motion-hover"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="branchInput" className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Preferred Branch / Course</label>
                <input 
                  id="branchInput"
                  type="text" 
                  placeholder="e.g. B.Tech Computer Science"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none motion-focus focus:border-primary focus:bg-surface"
                />
              </div>
              <div>
                <label htmlFor="subjectsInput" className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Favorite Subjects</label>
                <input 
                  id="subjectsInput"
                  type="text" 
                  placeholder="Maths, Physics, BEE (Comma separated)"
                  value={subjectsStr}
                  onChange={(e) => setSubjectsStr(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background p-3 text-base text-foreground outline-none motion-focus focus:border-primary focus:bg-surface"
                />
                <p className="mt-1.5 text-xs text-muted">We will use this to recommend resources in the future.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-muted bg-surface-hover motion-hover motion-active">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" /> 
                    <span aria-live="polite">Saving preferences...</span>
                  </>
                ) : (
                  "Save Preferences"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}