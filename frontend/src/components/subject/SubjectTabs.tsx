"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { searchDocuments, type Module, type Subject } from "@/app/lib/api";
import DocumentInteractiveGrid from "./DocumentInteractiveGrid";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { DocumentRecord } from "@/app/lib/document-types";

export default function SubjectTabs({
  subjectDetails,
  modules,
  moduleCounts,
  subjectSlug
}: {
  subjectDetails: Subject;
  modules: Module[];
  moduleCounts: Record<number, number>;
  subjectSlug: string;
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "notes" | "pyq" | "syllabus">("dashboard");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTabData = async () => {
      if (activeTab === "dashboard") return;

      setLoading(true);
      const response = await searchDocuments({
        subject: subjectDetails.name,
        category: activeTab,
        limit: 50
      });
      setDocuments(response.data);

      setLoading(false);
    };

    fetchTabData();
  }, [activeTab, subjectDetails.name]);

  return (
    <>
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
        {(["dashboard", "notes", "pyq", "syllabus"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2 text-xs font-bold capitalize transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && !subjectDetails?.is_non_module ? (
        <ErrorBoundary title="Course Modules could not load" message="The module grid hit an unexpected problem. Try refreshing.">
        <div className="space-y-4 pt-6">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted">
            Course Modules
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {modules.map((mod) => {
              const count = moduleCounts[mod.module_number] || 0;

              return (
                <Link
                  key={mod.id}
                  href={`/subject/${subjectSlug}/module-${mod.module_number}`}
                  className="group rounded-2xl border border-border bg-background p-5 text-center transition-all hover:-translate-y-1 hover:border-primary"
                >
                  <Layers
                    size={18}
                    className="mx-auto mb-2 text-muted group-hover:text-primary"
                  />

                  <p className="text-xs font-bold">
                    {mod.name || `Module ${mod.module_number}`}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {count} items indexed
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
        </ErrorBoundary>
      ) : activeTab !== "dashboard" ? (
        <div className="pt-6">
          <ErrorBoundary
            title="Document grid could not load"
            message="The filtered resources hit an unexpected problem. Try again or switch tabs."
          >
            <DocumentInteractiveGrid
              initialDocuments={documents}
              subjectSlug={subjectSlug}
              loading={loading}
            />
          </ErrorBoundary>
        </div>
      ) : null}
    </>
  );
}
