"use client";

import { useState, useEffect, useRef } from "react";
import { Edit, GraduationCap, BookOpen, X, Flame, Search } from "lucide-react";
import { getProfilePreferences, updateProfilePreferences } from "@/app/lib/api";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import { SUBJECTS_LIST } from "@/app/hooks/useClientLayout";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProfileHeader({ user, streak }: { user: any, streak?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const email = user?.email || "No email provided";
  const avatarUrl = user?.user_metadata?.avatar_url;
  
  // Preference States
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Refs for Focus Management
  const modalRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const getInitials = (fName: string) => fName === "Student" ? "ST" : (fName.substring(0, 2).toUpperCase() || "ST");
  const currentStreak = streak?.current_streak || 0;

  useEffect(() => {
    if (searchParams?.get("edit") === "true") {
      setIsEditModalOpen(true);
      router.replace("/profile");
    }
  }, [searchParams, router]);

  // Fetch existing preferences
  useEffect(() => {
    if (user?.id) {
      getProfilePreferences(user.id).then(data => {
        if (data) {
          setBranch(data.preferred_branch || "");
          setAcademicYear(data.academic_year || "");
          setFavoriteSubjects(data.favorite_subjects || []);
          setFullName(data.full_name || "Student");
        } else {
          setFullName("Student");
        }
      });
    }
  }, [user?.id]);

  useEffect(() => {
    if (isEditModalOpen && user?.id) {
      getProfilePreferences(user.id).then(data => {
        if (data) {
          setBranch(data.preferred_branch || "");
          setAcademicYear(data.academic_year || "");
          setFavoriteSubjects(data.favorite_subjects || []);
          if (data.full_name) setFullName(data.full_name);
        }
      });
    }
  }, [isEditModalOpen, user?.id]);

  // Focus Trap and Accessibility Keyboard Listeners
  useEffect(() => {
    if (!isEditModalOpen) {
      editButtonRef.current?.focus();
      return;
    }

    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditModalOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !fullName.trim()) return;
    if ((branch && !academicYear) || (!branch && academicYear)) {
      setErrorMsg("If you provide a branch, you must also provide your year, and vice versa.");
      return;
    }
    setErrorMsg("");
    setIsSaving(true);
    try {
      const updates = {
        full_name: fullName.trim(),
        preferred_branch: branch || undefined,
        academic_year: academicYear || undefined,
        favorite_subjects: favoriteSubjects
      };
      await updateProfilePreferences(user.id, updates);
      
      // Dispatch event to update layout context
      window.dispatchEvent(new CustomEvent("portal_profile_update", { detail: updates }));
      
      setIsEditModalOpen(false);
    } catch (error) {
      alert("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {(!fullName || fullName === "Student") && (
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-fade-in">
          <p className="text-sm font-semibold text-foreground text-center sm:text-left">
            Complete your profile to unlock personalized recommendations and community recognition.
          </p>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active"
          >
            Complete Profile
          </button>
        </div>
      )}
      <div className="mb-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName || "Student"} className="h-20 w-20 sm:h-14 sm:w-14 shrink-0 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="flex h-20 w-20 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow-sm">
              {getInitials(fullName || "Student")}
            </div>
          )}

          <div className="flex-1 min-w-0 w-full flex flex-col items-center sm:items-start">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-1 sm:mb-0.5">
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">{fullName || "Student"}</h1>
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
            
            <form onSubmit={handleSave}>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="nameInput" className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Display Name</label>
                  <input 
                    id="nameInput"
                    required
                    type="text" 
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none motion-focus focus:border-primary focus:bg-surface"
                  />
                </div>
                {errorMsg && <p className="text-sm font-semibold text-destructive">{errorMsg}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="branchInput" className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Preferred Branch / Course</label>
                    <input 
                      id="branchInput"
                      type="text" 
                      placeholder="e.g. B.Tech Computer Science"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none motion-focus focus:border-primary focus:bg-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Year</label>
                    <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary text-foreground motion-focus">
                      <option value="">Select Year</option>
                      <option value="1st year">1st year</option>
                      <option value="2nd year">2nd year</option>
                      <option value="3rd year">3rd year</option>
                      <option value="4th year">4th year</option>
                      <option value="5th year">5th year</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Favorite Subjects (Max 5)</label>
                  <div className="relative">
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 motion-focus-within focus-within:border-primary focus-within:bg-surface">
                      <Search size={16} className="text-muted ml-1" />
                      <input 
                        type="text" 
                        placeholder={favoriteSubjects.length < 5 ? "Search subjects..." : "Maximum subjects reached"}
                        value={subjectQuery}
                        onChange={(e) => setSubjectQuery(e.target.value)}
                        disabled={favoriteSubjects.length >= 5}
                        className="w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
                      />
                    </div>
                    {subjectQuery.trim() && favoriteSubjects.length < 5 && (
                      <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
                        {SUBJECTS_LIST.filter(s => s.toLowerCase().includes(subjectQuery.toLowerCase()) && !favoriteSubjects.includes(s)).map(subject => (
                          <button
                            key={subject}
                            type="button"
                            onClick={() => {
                              setFavoriteSubjects([...favoriteSubjects, subject]);
                              setSubjectQuery("");
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-primary/10 hover:text-primary motion-hover"
                          >
                            {subject}
                          </button>
                        ))}
                        {SUBJECTS_LIST.filter(s => s.toLowerCase().includes(subjectQuery.toLowerCase()) && !favoriteSubjects.includes(s)).length === 0 && (
                          <div className="px-3 py-2 text-xs text-muted">No subjects found.</div>
                        )}
                      </div>
                    )}
                  </div>
                  {favoriteSubjects.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {favoriteSubjects.map(subject => (
                        <span key={subject} className="flex items-center gap-1 rounded-full bg-primary/10 pl-3 pr-1 py-1 text-xs font-bold text-primary">
                          {subject}
                          <button type="button" onClick={() => setFavoriteSubjects(favoriteSubjects.filter(s => s !== subject))} className="rounded-full p-1 hover:bg-primary/20 text-primary motion-hover">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-muted">We will use this to recommend resources in the future.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-muted bg-surface-hover motion-hover motion-active">Cancel</button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <InlineSpinner label="Saving preferences" size={16} /> 
                      <span aria-live="polite">Saving preferences...</span>
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
