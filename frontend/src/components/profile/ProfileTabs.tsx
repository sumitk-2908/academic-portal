"use client";
import { useState } from "react";
import { FileText, Eye } from "lucide-react";

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState("overview");
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "library", label: "My Library" },
    { id: "contributions", label: "Contributions" },
    { id: "achievements", label: "Achievements" }
  ];

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

      {activeTab === "overview" && (
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B]">Continue Studying</h3>
          
          {/* Static Placeholder Content based on mockup */}
          {[
            { title: "Maths 1 — Module 2 class notes", meta: "Maths 1 · Module 2 · 2 hours ago", bg: "bg-[#EEEDFE] dark:bg-[#26215C]", text: "text-[#3C3489] dark:text-[#AFA9EC]" },
            { title: "Physics — Module 1 PYQ 2023", meta: "Physics · Module 1 · Yesterday", bg: "bg-[#E6F1FB] dark:bg-[#042C53]", text: "text-[#185FA5] dark:text-[#85B7EB]" },
            { title: "BEE — Syllabus overview", meta: "BEE · Syllabus · 3 days ago", bg: "bg-[#E1F5EE] dark:bg-[#04342C]", text: "text-[#085041] dark:text-[#5DCAA5]" }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-[#1F2A44] dark:bg-[#131625]">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.text}`}>
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                <p className="text-xs text-[#64748B] truncate">{item.meta}</p>
              </div>
              <button className="hidden sm:flex shrink-0 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[#6366F1]">
                <Eye size={12} /> Continue
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab !== "overview" && (
        <div className="py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          This section will be available in Phase 2.
        </div>
      )}
    </div>
  );
}