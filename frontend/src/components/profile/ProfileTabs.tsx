"use client";
import { useState, useEffect, useRef } from "react";
import { FileText, Eye, Download, BookOpen, Clock, Activity, Sparkles } from "lucide-react";
import Link from "next/link";
import { 
  trackDocumentStat, 
  triggerStreakUpdate, 
  logStudySession,
  getSuggestedNextSteps, // NEW: Imported for recommendations
  getTrendingDocuments   // NEW: Imported for fallbacks
} from "@/app/lib/api";
import ActivityHeatmap from "./ActivityHeatmap";
import AchievementsList from "./AchievementsList";
import ActivityTimeline from "./ActivityTimeline";
import UserDocumentCard from "./UserDocumentCard";

export default function ProfileTabs({ user, history, bookmarks, uploads, achievements }: any) {
  const [activeTab, setActiveTab] = useState("overview");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const downloadingRef = useRef<Set<number>>(new Set());
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "library", label: "My Library" },
    { id: "contributions", label: "Contributions" },
    { id: "achievements", label: "Achievements" },
    { id: "activity", label: "Activity" }
  ];

  // NEW: Fetch suggestions dynamically for the Profile Overview tab
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Only fetch if we are on the overview tab
      if (activeTab !== "overview") return;

      try {
        if (history.length > 0 && history.length < 5) {
          const lastDoc = history[0];
          const excludeIds = history.map((d: any) => d.id);
          const related = await getSuggestedNextSteps(lastDoc, excludeIds, 3);
          setSuggestions(related || []);
        } else if (history.length === 0) {
          const trending = await getTrendingDocuments();
          setSuggestions(trending ? trending.slice(0, 3) : []);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Failed to load profile suggestions:", error);
      }
    };

    fetchSuggestions();
  }, [history, activeTab]);

  const handleViewDocument = async (docId: number) => {
    await trackDocumentStat(docId, 'view');
    if (user?.id) {
      await triggerStreakUpdate(user.id);
      await logStudySession(user.id, docId);
    }
  };

  const handleDownload = async (e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    
    // NEW: Lock check
    if (downloadingRef.current.has(doc.id)) return;
    downloadingRef.current.add(doc.id);

    try {
      await trackDocumentStat(doc.id, 'download');
      const link = document.createElement("a");
      link.href = `${doc.file_url}?download=${encodeURIComponent(doc.title)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      // NEW: Unlock after 2 seconds
      setTimeout(() => {
        downloadingRef.current.delete(doc.id);
      }, 2000);
    }
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
          

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Continue Studying</h3>
              <Link href="/continue-studying" className="text-xs font-bold text-[#4F46E5] hover:underline">View All</Link>
            </div>
            
            {/* Standard History Render */}
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
              <div className="py-8 text-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/50 dark:border-[#1F2A44] dark:bg-[#131625]/50">
                 <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No recent study activity.</p>
              </div>
            )}

            {/* NEW: Dynamic Suggestions / Trending Fallback */}
            {suggestions.length > 0 && (
              <div className="mt-8 pt-4 border-t border-[#E5E7EB] dark:border-[#1F2A44] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-500 flex items-center gap-2">
                    <Sparkles size={14} />
                    {history.length === 0 ? "Trending Right Now" : "Suggested Next Steps"}
                  </h3>
                </div>
                
                {suggestions.map((item: any, idx: number) => (
                  <div key={`sugg-${idx}`} className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 hover:border-amber-500 transition-colors">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-xs text-[#64748B] truncate capitalize">{item.subject} • {item.category}</p>
                    </div>
                    <Link 
                      href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                      onClick={() => handleViewDocument(item.id)}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-amber-600"
                    >
                      <Eye size={12} /> View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Library Tab (Unchanged) */}
      {activeTab === "library" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
           {bookmarks.length > 0 ? bookmarks.map((item: any, idx: number) => (
             <div key={idx} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#1F2A44] dark:bg-[#131625]">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><BookOpen size={18} /></div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                 <p className="text-xs text-[#64748B] truncate capitalize">{item.subject}</p>
               </div>
               
               <div className="shrink-0 flex items-center gap-2">
                 <Link 
                   href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                   onClick={() => handleViewDocument(item.id)}
                   className="flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#6366F1]"
                 >
                   <Eye size={12} /> View
                 </Link>
                 <button 
                   onClick={(e) => handleDownload(e, item)} 
                   className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase text-gray-600 border dark:border-[#1F2A44] dark:bg-[#0D0F1A] dark:text-gray-300 hover:bg-gray-100"
                 >
                   <Download size={12} />
                 </button>
               </div>
             </div>
           )) : <p className="text-sm text-gray-500">No bookmarks yet.</p>}
        </div>
      )}

      {/* Contributions Tab (Unchanged) */}
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
             <UserDocumentCard 
               key={idx} 
               item={item} 
               onRefresh={() => window.dispatchEvent(new Event("sidebar_update"))} 
             />
           )) : <p className="text-sm text-gray-500">You haven't uploaded any resources yet.</p>}
        </div>
      )}

      {/* Achievements Tab (Unchanged) */}
      {activeTab === "achievements" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <AchievementsList achievements={achievements} />
        </div>
      )}

      {/* Activity Tab (Unchanged) */}
      {activeTab === "activity" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           <ActivityTimeline history={history} bookmarks={bookmarks} uploads={uploads} />
        </div>
      )}
    </div>
  );
}