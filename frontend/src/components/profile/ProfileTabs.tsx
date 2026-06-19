"use client";
import { useState } from "react";
import { FileText, Eye, Download, BookOpen, Clock, Activity } from "lucide-react";
import Link from "next/link";
import { trackDocumentStat, triggerStreakUpdate, logStudySession } from "@/app/lib/api";
import ActivityHeatmap from "./ActivityHeatmap";
import SubjectProgress from "./SubjectProgress";
import AchievementsList from "./AchievementsList";
import ActivityTimeline from "./ActivityTimeline";

export default function ProfileTabs({ user, history, bookmarks, uploads, achievements }: any) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "library", label: "My Library" },
    { id: "contributions", label: "Contributions" },
    { id: "achievements", label: "Achievements" },
    { id: "activity", label: "Activity" }
  ];

const handleViewDocument = async (docId: number) => {
    // 1. Track global view count
    await trackDocumentStat(docId, 'view');
    
    // 2. Wrap user-specific stats securely in curly braces
    if (user?.id) {
      await triggerStreakUpdate(user.id);
      await logStudySession(user.id, docId);
    }
  };

  const handleDownload = async (e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    
    // 1. Fire and await the backend tracker first
    await trackDocumentStat(doc.id, 'download');
    
    // 2. Execute the actual browser download
    const link = document.createElement("a");
    link.href = `${doc.file_url}?download=${encodeURIComponent(doc.title)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-6 flex overflow-x-auto border-b border-[#E5E7EB] dark:border-[#1F2A44] hide-scrollbar sticky top-16 z-30 bg-[#FAFAF9] dark:bg-[#0B1020] pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pt-0 sm:static sm:bg-transparent lg:dark:bg-transparent">
        {tabs.map((tab) => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === tab.id
                ? "border-[#4F46E5] text-gray-900 dark:text-white"
                : "border-transparent text-[#64748B] hover:text-gray-700 dark:text-[#94A3B8] dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {history.length > 0 && <ActivityHeatmap history={history} />}
          {history.length > 0 && <SubjectProgress history={history} />}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Continue Studying</h3>
              <Link href="/continue-studying" className="text-xs font-bold text-[#4F46E5] hover:underline">View All</Link>
            </div>
            
            {history.length > 0 ? history.slice(0, 3).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#1F2A44] dark:bg-[#131625]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEEDFE] text-[#3C3489] dark:bg-[#26215C] dark:text-[#AFA9EC]">
                  <Clock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-[#64748B] truncate capitalize">{item.subject} • {item.category}</p>
                </div>
                <Link 
                  href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                  onClick={() => handleViewDocument(item.id)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#6366F1]"
                >
                  <Eye size={12} /> Resume
                </Link>
              </div>
            )) : (
              <div className="py-12 text-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/50 dark:border-[#1F2A44] dark:bg-[#131625]/50">
                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No recent study activity.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "library" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
           {bookmarks.length > 0 ? bookmarks.map((item: any, idx: number) => (
             <div key={idx} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#1F2A44] dark:bg-[#131625]">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><BookOpen size={18} /></div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                 <p className="text-xs text-[#64748B] truncate capitalize">{item.subject}</p>
               </div>
               <button onClick={(e) => handleDownload(e, item)} className="shrink-0 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase text-gray-600 border dark:border-[#1F2A44] dark:bg-[#0D0F1A] dark:text-gray-300 hover:bg-gray-100"><Download size={12} /></button>
             </div>
           )) : <p className="text-sm text-gray-500">No bookmarks yet.</p>}
        </div>
      )}

      {/* PHASE 3.4: UPGRADED CONTRIBUTIONS DASHBOARD */}
      {activeTab === "contributions" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
               <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Total Uploads</div>
               <div className="text-2xl font-black text-gray-900 dark:text-white">{uploads.length}</div>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
               <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Total Impact</div>
               <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                 {uploads.reduce((acc: number, u: any) => acc + (u.document_analytics?.download_count || 0), 0)} DLs
               </div>
            </div>
          </div>

          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Upload History</h3>
          {uploads.length > 0 ? uploads.map((item: any, idx: number) => (
             <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-[#1F2A44] dark:bg-[#131625]">
               <div className="flex items-center gap-4 min-w-0">
                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><FileText size={18} /></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                   <p className="text-xs text-[#64748B] truncate capitalize">
                     {item.subject} • <span className={item.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}>{item.status}</span>
                   </p>
                 </div>
               </div>
               <div className="flex items-center gap-4 text-xs font-bold text-[#64748B] dark:text-[#94A3B8] sm:ml-auto ml-14 shrink-0">
                 <span className="flex items-center gap-1.5"><Eye size={14} /> {item.document_analytics?.view_count || 0}</span>
                 <span className="flex items-center gap-1.5"><Download size={14} /> {item.document_analytics?.download_count || 0}</span>
               </div>
             </div>
           )) : <p className="text-sm text-gray-500">You haven't uploaded any resources yet.</p>}
        </div>
      )}

      {/* PHASE 3.4: ACHIEVEMENTS TAB */}
      {activeTab === "achievements" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <AchievementsList achievements={achievements} />
        </div>
      )}

      {/* PHASE 3.4: ACTIVITY TAB */}
      {activeTab === "activity" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <ActivityTimeline history={history} bookmarks={bookmarks} uploads={uploads} />
        </div>
      )}
    </div>
  );
}