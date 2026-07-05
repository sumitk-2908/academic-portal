"use client";

import { useEffect, useState, useRef } from "react";
import { 
  supabase, 
  getRecentStudyActivity, 
  trackDocumentStat, 
  getSuggestedNextSteps, 
  getTrendingDocuments,
  getProfilePreferences 
} from "../lib/api";
import { requestAuthPrompt } from "../lib/auth-prompts";
import { Clock, Eye, Download, FileText, Loader2, NotebookPen, FileQuestion, ListChecks, Sparkles } from "lucide-react";
import Link from "next/link";

// Added tutorial_sheet to match the doccategory ENUM in database.types.ts
const CATEGORY_ICONS: Record<string, any> = { 
  notes: NotebookPen, 
  pyq: FileQuestion, 
  syllabus: ListChecks,
  tutorial_sheet: FileText 
};

export default function ContinueStudyingPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const downloadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const fetchHistoryAndSuggestions = async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      const currentUserId = sess?.session?.user?.id;

      if (!currentUserId) {
        setDocuments([]);
        setSuggestions([]);
        setIsSignedOut(true);
        setLoading(false);
        return;
      }

      setIsSignedOut(false);
      
      // 1. Fetch User History
      const history = await getRecentStudyActivity(currentUserId);
      const safeHistory = Array.isArray(history) ? history : [];
      setDocuments(safeHistory);
      const historyIds = new Set(safeHistory.map((d: any) => d.id));

      // 2. Fetch User Profile Preferences (Favorites & Branch)
      let userFavs: string[] = [];
      let userBranch: string | null = null;
      
      if (currentUserId) {
        try {
          const profile = await getProfilePreferences(currentUserId);
          if (profile?.favorite_subjects) userFavs = profile.favorite_subjects;
          if (profile?.preferred_branch) userBranch = profile.preferred_branch; // Fixed schema property
        } catch (e) {
          console.error("Failed to fetch profile preferences", e);
        }
      }

      // 3. Build Recommendation Candidate Pools
      let candidates: any[] = [];

      try {
        // Pool A: Popular/Trending (Acts as base and fallback)
        const trending = await getTrendingDocuments();
        candidates = [...candidates, ...trending.map((d: any) => ({ ...d, recSource: 'trending' }))];

        // Pool B: History-based (Related to last document)
        if (safeHistory.length > 0) {
          const lastDoc = safeHistory[0];
          const related = await getSuggestedNextSteps(lastDoc, Array.from(historyIds), 5);
          candidates = [...candidates, ...related.map((d: any) => ({ ...d, recSource: 'related' }))];
        }

        // Pool C: Profile-based (Favorites)
        if (userFavs.length > 0) {
          const { data: profileDocs } = await supabase
            .from('documents')
            .select('*')
            .in('subject', userFavs)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (profileDocs) {
            candidates = [...candidates, ...profileDocs.map((d: any) => ({ ...d, recSource: 'profile' }))];
          }
        }
      } catch (e) {
        console.error("Error generating recommendation pools", e);
      }

      // 4. Intelligent Scoring & Ranking Algorithm
      const scoredDocs = new Map<number, any>();

      candidates.forEach(doc => {
        // Exclude items the user has already studied
        if (historyIds.has(doc.id)) return;

        let score = 0;
        
        // Base weights by source
        if (doc.recSource === 'related') score += 10;
        if (doc.recSource === 'profile') score += 8;
        if (doc.recSource === 'trending') score += 4;

        // Contextual Boosts
        if (userFavs.includes(doc.subject)) score += 5;
        
        // Branch match boost (Fuzzy match since documents table lacks a branch column)
        if (userBranch && (
          doc.subject?.toLowerCase().includes(userBranch.toLowerCase()) || 
          doc.title?.toLowerCase().includes(userBranch.toLowerCase())
        )) {
          score += 5; 
        }
        
        // Popularity Tie-breaker using correct view_count field
        const popularityBonus = doc.view_count ? Math.min(doc.view_count / 50, 3) : 0;
        score += popularityBonus;

        // Deduplication & Score Aggregation
        if (scoredDocs.has(doc.id)) {
          scoredDocs.get(doc.id).score += (score * 0.5); 
        } else {
          scoredDocs.set(doc.id, { ...doc, score });
        }
      });

      // 5. Sort by final score and take top 3
      const finalRecommendations = Array.from(scoredDocs.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setSuggestions(finalRecommendations);
      setLoading(false);
    };

    fetchHistoryAndSuggestions();
  }, []);

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

  const safeDocuments = Array.isArray(documents) ? documents : [];

  const DocumentCard = ({ doc, isSuggestion = false }: { doc: any, isSuggestion?: boolean }) => {
    const Icon = CATEGORY_ICONS[doc?.category] || FileText;
    
    let badgeText = "Recommended";
    if (isSuggestion && doc.score) {
      if (doc.recSource === 'related') badgeText = "Because you studied this";
      else if (doc.recSource === 'profile') badgeText = "Based on your favorites";
      else if (doc.recSource === 'trending') badgeText = "Trending right now";
    }

    return (
      <article className={`group flex flex-col rounded-2xl border ${isSuggestion ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500' : 'border-border bg-surface hover:border-indigo-500'} p-4 shadow-sm transition-all hover:-translate-y-0.5   dark:hover:border-indigo-500`}>
        
        {isSuggestion && (
          <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full mb-3 self-start">
            {badgeText}
          </span>
        )}

        <div className="flex items-start justify-between">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isSuggestion ? 'bg-amber-500/10 text-amber-600' : 'bg-indigo-500/10 text-indigo-500'}`}>
            <Icon size={16} />
          </div>
          <span className="text-xs font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{doc.subject}</span>
        </div>
        <h3 className="text-xs font-bold mt-3 line-clamp-2 min-h-[2rem]">{doc.title}</h3>
        <div className="mt-4 flex gap-2 border-t pt-3 ">
          <button onClick={(e) => handleDownload(e, doc)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-surface py-2 rounded-xl border  hover:bg-surface-hover ">
            <Download size={12} /> Download
          </button>
          <Link href={`/subject/${doc.subject?.toLowerCase().replace(/ /g, '-') || 'unknown'}/module-${doc.module_id || 1}/${doc.id}`} className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2 rounded-xl ${isSuggestion ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
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
        ) : isSignedOut ? (
          <div className="col-span-full rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/5 p-8 text-center">
            <p className="mx-auto max-w-md text-sm font-medium leading-6 text-muted">
              Sign in to pick up where you left off and get study suggestions based on your recent materials.
            </p>
            <button onClick={() => requestAuthPrompt("continueStudying")} className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white motion-hover motion-active hover:opacity-90">
              Continue Studying
            </button>
          </div>
        ) : safeDocuments.map(doc => (
            <DocumentCard key={`hist-${doc.id}`} doc={doc} />
          ))}
          
          {safeDocuments.length === 0 && !loading && !isSignedOut && (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-muted">Your history is empty. Time to start studying!</p>
            </div>
          )}
        </div>
      </section>

      {/* SUGGESTIONS SECTION */}
      {!loading && suggestions.length > 0 && (
        <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
           <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h2 className="text-lg font-bold text-foreground ">
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
