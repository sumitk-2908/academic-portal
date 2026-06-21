"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, getRecentStudyActivity, trackDocumentStat, getSuggestedNextSteps, getTrendingDocuments } from "../lib/api";
import { Clock, Eye, Download, FileText, Loader2, NotebookPen, FileQuestion, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, any> = { notes: NotebookPen, pyq: FileQuestion, syllabus: ListChecks };

export default function ContinueStudyingPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const downloadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const fetchHistoryAndSuggestions = async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const currentUserId = sess?.session?.user?.id;
      
      const history = await getRecentStudyActivity(currentUserId);
      const safeHistory = Array.isArray(history) ? history : [];
      setDocuments(safeHistory);

      // --- PERSONALIZATION LOGIC ---
      if (safeHistory.length > 0 && safeHistory.length < 5) {
        // User has some history, but not a lot. Suggest related items based on their LAST viewed doc.
        const lastDoc = safeHistory[0];
        const excludeIds = safeHistory.map(d => d.id);
        const related = await getSuggestedNextSteps(lastDoc, excludeIds, 3);
        setSuggestions(related);
      } else if (safeHistory.length === 0) {
        // No history at all? Fallback to global trending to avoid an empty screen
        const trending = await getTrendingDocuments();
        setSuggestions(trending.slice(0, 3));
      }

      setLoading(false);
    };

    fetchHistoryAndSuggestions();
  }, []);

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

  const safeDocuments = Array.isArray(documents) ? documents : [];

  // Reusable Document Card Component to keep JSX clean
  const DocumentCard = ({ doc, isSuggestion = false }: { doc: any, isSuggestion?: boolean }) => {
    const Icon = CATEGORY_ICONS[doc?.category] || FileText;
    return (
      <article className={`group flex flex-col rounded-2xl border ${isSuggestion ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500' : 'border-[#E5E7EB] bg-white hover:border-indigo-500'} p-4 shadow-sm transition-all hover:-translate-y-0.5 dark:border-[#1F2A44] dark:bg-[#111827] dark:hover:border-indigo-500`}>
        <div className="flex items-start justify-between">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isSuggestion ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-500'}`}>
            <Icon size={16} />
          </div>
          <span className="text-[9px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{doc.subject}</span>
        </div>
        <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
        <div className="mt-4 flex gap-2 border-t pt-3 dark:border-[#1F2A44]">
          <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#F8FAFC] py-2 rounded-xl border dark:bg-[#1F2A44] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]">
            <Download size={12} /> Download
          </button>
          <Link href={`/subject/${doc.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${doc.module_id || 1}/${doc.id}`} className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-white py-2 rounded-xl ${isSuggestion ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
            <Eye size={12} /> View
          </Link>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-10 animate-fade-up max-w-6xl mx-auto">
      
      {/* HISTORY SECTION */}
      <section className="space-y-6">
        <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center"><Clock size={24} /></div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-3xl">Continue Studying</h1>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-1">Jump back into your recent materials</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-12"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : safeDocuments.map(doc => (
            <DocumentCard key={`hist-${doc.id}`} doc={doc} />
          ))}
          
          {safeDocuments.length === 0 && !loading && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-[#64748B]">Your history is empty. Time to start studying!</p>
            </div>
          )}
        </div>
      </section>

      {/* SUGGESTIONS SECTION (Only shows if there are suggestions) */}
      {!loading && suggestions.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
           <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {safeDocuments.length === 0 ? "Trending Right Now" : "Suggested Next Steps"}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map(doc => (
              <DocumentCard key={`sugg-${doc.id}`} doc={doc} isSuggestion={true} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}