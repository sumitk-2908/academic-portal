"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, Download, BookOpen, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { 
  trackDocumentStat, 
  triggerStreakUpdate, 
  logStudySession,
  getSuggestedNextSteps, 
  getTrendingDocuments   
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
   
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && tabs.some(t => t.id === tab)) {
        setActiveTab(tab);
        window.history.replaceState(null, '', '/profile');
      }
    }
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
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
      setTimeout(() => {
        downloadingRef.current.delete(doc.id);
      }, 2000);
    }
  };

  return (
    <div>
      <div className="mb-6 flex overflow-x-auto border-b border-border hide-scrollbar sticky top-16 z-30 bg-background pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pt-0 sm:static">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold motion-hover ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="animate-fade-up">
          {history.length > 0 && <ActivityHeatmap history={history} />}
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-muted">Continue Studying</h3>
              <Link href="/continue-studying" className="text-sm font-bold text-primary hover:opacity-80 motion-hover">View All</Link>
            </div>
            
            {history.length > 0 ? history.slice(0, 3).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted truncate capitalize">{item.subject} • {item.category}</p>
                </div>
                <Link 
                  href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                  onClick={() => handleViewDocument(item.id)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground motion-hover motion-active hover:opacity-90"
                >
                  <Eye size={12} /> Resume
                </Link>
              </div>
            )) : (
              <div className="py-8 text-center rounded-2xl border border-dashed border-border bg-surface-hover/50">
                 <p className="text-sm font-medium text-muted">No recent study activity.</p>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-warning flex items-center gap-2">
                    <Sparkles size={14} />
                    {history.length === 0 ? "Trending Right Now" : "Suggested Next Steps"}
                  </h3>
                </div>
                
                {suggestions.map((item: any, idx: number) => (
                  <div key={`sugg-${idx}`} className="flex items-center gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-3 hover:border-warning motion-hover shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted truncate capitalize">{item.subject} • {item.category}</p>
                    </div>
                    <Link 
                      href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                      onClick={() => handleViewDocument(item.id)}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-xs font-bold uppercase text-white motion-hover motion-active hover:opacity-90"
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

      {activeTab === "library" && (
        <div className="space-y-4 animate-fade-up">
           {bookmarks.length > 0 ? bookmarks.map((item: any, idx: number) => (
             <div key={idx} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 shadow-sm">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"><BookOpen size={18} /></div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                 <p className="text-xs text-muted truncate capitalize">{item.subject}</p>
               </div>
               
               <div className="shrink-0 flex items-center gap-2">
                 <Link 
                   href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                   onClick={() => handleViewDocument(item.id)}
                   className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground motion-hover motion-active hover:opacity-90"
                 >
                   <Eye size={12} /> View
                 </Link>
                 <button 
                   onClick={(e) => handleDownload(e, item)} 
                   className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-1.5 text-xs font-bold uppercase text-foreground border border-border motion-hover motion-active hover:opacity-80"
                 >
                   <Download size={12} />
                 </button>
               </div>
             </div>
           )) : <p className="text-sm font-medium text-muted">No bookmarks yet.</p>}
        </div>
      )}

      {activeTab === "contributions" && (
        <div className="space-y-4 animate-fade-up">
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
               <div className="text-xs font-bold text-muted uppercase tracking-[0.06em] mb-1">Total Uploads</div>
               <div className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">{uploads.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
               <div className="text-xs font-bold text-muted uppercase tracking-[0.06em] mb-1">Total Impact</div>
               <div className="text-3xl font-extrabold tracking-tight text-success tabular-nums">
                 {uploads.reduce((acc: number, u: any) => acc + (u.document_analytics?.download_count || 0), 0)} DLs
               </div>
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-muted">Upload History</h3>
          {uploads.length > 0 ? uploads.map((item: any, idx: number) => (
             <UserDocumentCard 
               key={idx} 
               item={item} 
               onRefresh={() => window.dispatchEvent(new Event("sidebar_update"))} 
             />
           )) : <p className="text-sm font-medium text-muted">You haven't uploaded any resources yet.</p>}
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="animate-fade-up">
           <AchievementsList achievements={achievements} />
        </div>
      )}

      {activeTab === "activity" && (
        <div className="animate-fade-up">
           <ActivityTimeline history={history} bookmarks={bookmarks} uploads={uploads} />
        </div>
      )}
    </div>
  );
}