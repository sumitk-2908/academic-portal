"use client";
import { useState } from "react";
import { FileText, Eye, Download, BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { trackDocumentStat } from "@/app/lib/api";

export default function ProfileTabs({ history, bookmarks, uploads }: { history: any[], bookmarks: any[], uploads: any[] }) {
  const [activeTab, setActiveTab] = useState("overview");
  
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "library", label: "My Library" },
    { id: "contributions", label: "Contributions" },
  ];

  const handleDownload = (e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    trackDocumentStat(doc.id, 'download');
    const link = document.createElement("a");
    link.href = `${doc.file_url}?download=${encodeURIComponent(doc.title)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-6 flex overflow-x-auto border-b border-[#E5E7EB] dark:border-[#1F2A44] hide-scrollbar">
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

      {/* OVERVIEW / CONTINUE STUDYING */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Continue Studying</h3>
            <Link href="/continue-studying" className="text-xs font-bold text-[#4F46E5] hover:underline">View All</Link>
          </div>
          
          {history.length > 0 ? history.map((item, idx) => (
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
                onClick={() => trackDocumentStat(item.id, 'view')}
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#6366F1]"
              >
                <Eye size={12} /> Resume
              </Link>
            </div>
          )) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/50 dark:border-[#1F2A44] dark:bg-[#131625]/50">
               <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No recent study activity.</p>
               <Link href="/" className="mt-2 inline-block rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-[#1F2A44] dark:bg-[#131625] dark:text-gray-300 dark:hover:bg-[#1F2A44]">
                 Start exploring resources
               </Link>
            </div>
          )}
        </div>
      )}

      {/* MY LIBRARY / BOOKMARKS */}
      {activeTab === "library" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">My Bookmarks</h3>
            <Link href="/bookmarks" className="text-xs font-bold text-[#4F46E5] hover:underline">View All Bookmarks</Link>
          </div>

          {bookmarks.length > 0 ? bookmarks.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#1F2A44] dark:bg-[#131625]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <BookOpen size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                <p className="text-xs text-[#64748B] truncate capitalize">{item.subject} • Module {item.module_id}</p>
              </div>
              <div className="hidden sm:flex gap-2">
                <button onClick={(e) => handleDownload(e, item)} className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-gray-50 px-3 py-1.5 text-[10px] font-bold uppercase text-gray-600 transition-colors hover:bg-gray-100 dark:border-[#1F2A44] dark:bg-[#0D0F1A] dark:text-gray-300 dark:hover:bg-[#1F2A44]">
                  <Download size={12} />
                </button>
                <Link 
                  href={`/subject/${item.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${item.module_id || 1}/${item.id}`}
                  onClick={() => trackDocumentStat(item.id, 'view')}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#4F46E5] px-4 py-1.5 text-[10px] font-bold uppercase text-white transition-colors hover:bg-[#6366F1]"
                >
                  <Eye size={12} /> View
                </Link>
              </div>
            </div>
          )) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/50 dark:border-[#1F2A44] dark:bg-[#131625]/50">
               <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No bookmarked resources yet.</p>
               <Link href="/" className="mt-2 inline-block rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-[#1F2A44] dark:bg-[#131625] dark:text-gray-300 dark:hover:bg-[#1F2A44]">
                 Browse Subjects
               </Link>
            </div>
          )}
        </div>
      )}

      {/* CONTRIBUTIONS / UPLOADS */}
      {activeTab === "contributions" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">My Uploads</h3>
          
          {uploads.length > 0 ? uploads.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#1F2A44] dark:bg-[#131625]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                <p className="text-xs text-[#64748B] truncate capitalize">
                  {item.subject} • {new Date(item.created_at).toLocaleDateString()}
                  {item.status && ` • ${item.status}`}
                </p>
              </div>
            </div>
          )) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white/50 dark:border-[#1F2A44] dark:bg-[#131625]/50">
               <FileText size={24} className="mx-auto mb-2 text-[#64748B] dark:text-[#94A3B8]" />
               <p className="text-sm font-medium text-gray-900 dark:text-white">Contributions feature coming soon.</p>
               <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">You haven't uploaded any documents yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}