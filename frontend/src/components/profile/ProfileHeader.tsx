"use client";
import { useState } from "react";
import { Edit, GraduationCap, BookOpen, X } from "lucide-react";

export default function ProfileHeader({ user }: { user: any }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const name = user?.user_metadata?.full_name || "Student User";
  const email = user?.email || "No email provided";
  const avatarUrl = user?.user_metadata?.avatar_url;
  
  const [displayName, setDisplayName] = useState(name);

  // Generate Initials if no Google Avatar exists
  const getInitials = (fullName: string) => {
    return fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 dark:border-[#1F2A44] dark:bg-[#131625]">
        <div className="flex items-start gap-4">
          
          {/* Avatar Rendering */}
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-14 w-14 shrink-0 rounded-full object-cover shadow-sm" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-xl font-bold text-white shadow-sm">
              {getInitials(name)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">{name}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{email}</p>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1.5"><GraduationCap size={14} /> Academic Portal</span>
              <span className="flex items-center gap-1.5"><BookOpen size={14} /> Student Account</span>
            </div>
          </div>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="hidden sm:flex shrink-0 items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-xs font-bold text-[#64748B] transition-colors hover:bg-gray-50 dark:border-[#1F2A44] dark:text-[#94A3B8] dark:hover:bg-[#1F2A44]"
          >
            <Edit size={14} /> Edit
          </button>
        </div>
      </div>

      {/* Basic Edit Modal Setup (UI Only per Phase 2 requirements) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-[#131625] dark:border dark:border-[#1F2A44]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-gray-50 p-3 text-sm text-gray-900 outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#0D0F1A] dark:text-white dark:focus:border-[#4F46E5]"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1F2A44]"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert("Profile updates will be fully enabled in a future release.");
                  setIsEditModalOpen(false);
                }} 
                className="rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6366F1]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}