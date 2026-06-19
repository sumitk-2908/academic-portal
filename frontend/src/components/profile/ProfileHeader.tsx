"use client";
import { useState, useEffect } from "react";
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
  const [subjectsStr, setSubjectsStr] = useState(""); // Comma separated for easy editing

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
      <div className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 dark:border-[#1F2A44] dark:bg-[#131625]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-20 w-20 sm:h-14 sm:w-14 shrink-0 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="flex h-20 w-20 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-2xl sm:text-xl font-bold text-white shadow-sm">
              {getInitials(name)}
            </div>
          )}

          <div className="flex-1 min-w-0 w-full flex flex-col items-center sm:items-start">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-1 sm:mb-0.5">
              <h1 className="text-xl sm:text-lg font-black text-gray-900 dark:text-white">{name}</h1>
              {currentStreak > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:bg-orange-500/10 dark:text-orange-500">
                  <Flame size={12} fill="currentColor" />
                  {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <p className="text-sm sm:text-xs text-gray-500 dark:text-gray-400 mb-3">{email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5"><GraduationCap size={14} /> {branch || "Academic Portal"}</span>
              <span className="flex items-center gap-1.5"><BookOpen size={14} /> Student Account</span>
            </div>
          </div>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="mt-3 flex w-full sm:mt-0 sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2.5 sm:py-2 text-sm sm:text-xs font-bold text-[#64748B] transition-colors hover:bg-gray-50 dark:border-[#1F2A44] dark:text-[#94A3B8] dark:hover:bg-[#1F2A44]"
          >
            <Edit size={14} /> Edit Profile
          </button>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#131625] dark:border dark:border-[#1F2A44]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Personalize Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">Preferred Branch / Course</label>
                <input 
                  type="text" 
                  placeholder="e.g. B.Tech Computer Science"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-gray-50 p-3 text-sm text-gray-900 outline-none focus:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#0D0F1A] dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">Favorite Subjects</label>
                <input 
                  type="text" 
                  placeholder="Maths, Physics, BEE (Comma separated)"
                  value={subjectsStr}
                  onChange={(e) => setSubjectsStr(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-gray-50 p-3 text-sm text-gray-900 outline-none focus:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#0D0F1A] dark:text-white"
                />
                <p className="mt-1.5 text-[10px] text-gray-500">We will use this to recommend resources in the future.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1F2A44]">Cancel</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6366F1] disabled:opacity-70"
              >
                {isSaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}