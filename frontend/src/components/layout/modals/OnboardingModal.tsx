"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search } from "lucide-react";
import { ClientLayoutContext, SUBJECTS_LIST } from "@/app/hooks/useClientLayout";
import { supabase } from "@/app/lib/api";

export const OnboardingModal = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const handleSkip = () => {
    sessionStorage.setItem(`skipped_onboarding_${ctx.currentUserEmail}`, "true");
    ctx.setShowOnboardingModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Display name is required.");
      return;
    }
    if ((branch && !academicYear) || (!branch && academicYear)) {
      setErrorMsg("If you provide a branch, you must also provide your year, and vice versa.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        const { error } = await supabase.from('profiles').upsert({
          id: sess.session.user.id,
          full_name: name.trim(),
          preferred_branch: branch || null,
          academic_year: academicYear || null,
          favorite_subjects: favoriteSubjects,
        });
        if (error) throw error;
        ctx.updateUserProfile({ 
          full_name: name.trim(), 
          preferred_branch: branch || undefined, 
          academic_year: academicYear || undefined, 
          favorite_subjects: favoriteSubjects 
        });
        ctx.setShowOnboardingModal(false);
      }
    } catch (err: any) {
      setErrorMsg("Error saving profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={ctx.showOnboardingModal} onOpenChange={(open) => {
      if (!open && !sessionStorage.getItem(`skipped_onboarding_${ctx.currentUserEmail}`)) return;
      ctx.setShowOnboardingModal(open);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-[100] w-full max-w-md translate-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl">
          <div className="mb-6">
            <Dialog.Title className="text-xl font-extrabold text-foreground">Welcome!</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 font-medium text-muted">
              Let&apos;s set up your profile so you can get the most out of the portal.
            </Dialog.Description>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && <p className="text-sm font-semibold text-destructive">{errorMsg}</p>}
            <div>
              <label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Display Name *</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Branch</label>
                <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. CSE" className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Year</label>
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">
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
              <label className="mb-2 block text-xs font-bold tracking-[0.06em] text-muted uppercase">Favorite Subjects (Max 5)</label>
              <div className="relative">
                <div className="motion-focus-within flex items-center gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-primary focus-within:bg-surface">
                  <Search size={16} className="ml-1 text-muted" />
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
                        className="motion-hover w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-primary/10 hover:text-primary"
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {favoriteSubjects.map(subject => (
                     <span key={subject} className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-xs font-bold text-primary">
                      {subject}
                      <button type="button" onClick={() => setFavoriteSubjects(favoriteSubjects.filter(s => s !== subject))} className="motion-hover rounded-full p-1 text-primary hover:bg-primary/20">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="motion-hover motion-active h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90">
                {loading ? "Saving..." : "Save & Continue"}
              </button>
              <button type="button" onClick={handleSkip} disabled={loading} className="mt-2 w-full text-xs font-bold text-muted hover:text-foreground">
                Skip for now
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
