"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { searchDocuments, supabase } from "@/app/lib/api";
import DocumentInteractiveGrid from "./DocumentInteractiveGrid";

export default function SubjectTabs({ 
  subjectDetails, 
  modules, 
  moduleCounts, 
  subjectSlug 
}: { 
  subjectDetails: any; 
  modules: any[]; 
  moduleCounts: Record<number, number>;
  subjectSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "notes" | "pyq" | "syllabus" | "bookmarks">("dashboard");
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTabData = async () => {
      if (activeTab === "dashboard") return;
      
      setLoading(true);
      if (activeTab === "bookmarks") {
        const bookmarks = JSON.parse(localStorage.getItem("portal_bookmarks") || "[]").map((b: any) => typeof b === 'object' ? b.id : b);
        if (bookmarks.length > 0) {
          const { data } = await supabase.from('documents').select('*').in('id', bookmarks).eq('status', 'approved');
          setDocuments(data || []);
        } else {
          setDocuments([]);
        }
      } else {
        const response = await searchDocuments({
           subject: subjectDetails.name,
           category: activeTab,
           limit: 50 
        });
        setDocuments(response.data);
      }
      setLoading(false);
    }
    
    fetchTabData();
  }, [activeTab, subjectDetails.name]);

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-[#E5E7EB] pb-1 dark:border-[#1F2A44]">
        {["dashboard", "notes", "pyq", "syllabus", "bookmarks"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-xs font-bold border-b-2 capitalize transition-colors ${
              activeTab === tab 
                ? "border-[#4F46E5] text-[#4F46E5]" 
                : "border-transparent text-[#64748B] hover:text-[#0F172A] dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && !subjectDetails?.is_non_module ? (
        <div className="space-y-4 pt-6">
          <h2 className="text-xs font-extrabold uppercase text-[#64748B] tracking-wider">Course Modules</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {modules.map(mod => {
              const count = moduleCounts[mod.module_number] || 0;
              return (
                <Link key={mod.id} href={`/subject/${subjectSlug}/module-${mod.module_number}`} className="group rounded-2xl border border-[#E5E7EB] bg-[#FAFAF9] p-5 text-center transition-all hover:-translate-y-1 hover:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#0B1020]">
                  <Layers size={18} className="mx-auto text-[#64748B] group-hover:text-[#4F46E5] mb-2" />
                  <p className="text-xs font-bold">{mod.name || `Module ${mod.module_number}`}</p>
                  <p className="text-[10px] text-[#64748B] mt-1">{count} items indexed</p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : activeTab !== "dashboard" ? (
        <div className="pt-6">
          <DocumentInteractiveGrid initialDocuments={documents} subjectSlug={subjectSlug} loading={loading} />
        </div>
      ) : null}
    </>
  );
}