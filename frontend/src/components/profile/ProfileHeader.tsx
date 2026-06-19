import { Edit, GraduationCap, BookOpen } from "lucide-react";

export default function ProfileHeader() {
  return (
    <div className="mb-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 dark:border-[#1F2A44] dark:bg-[#131625]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-xl font-bold text-white shadow-sm">
          SK
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Sumit Kumar</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">sumit@college.edu</p>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5"><GraduationCap size={14} /> XLRI Engineering</span>
            <span className="flex items-center gap-1.5"><BookOpen size={14} /> 1st year · CSE</span>
          </div>
        </div>
        <button className="hidden sm:flex shrink-0 items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-xs font-bold text-[#64748B] transition-colors hover:bg-gray-50 dark:border-[#1F2A44] dark:text-[#94A3B8] dark:hover:bg-[#1F2A44]">
          <Edit size={14} /> Edit
        </button>
      </div>
    </div>
  );
}