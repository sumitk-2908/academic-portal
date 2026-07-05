"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Subject } from "@/app/lib/api"; 
import { SUBJECT_UI_MAP } from "@/app/lib/subject-config";
import { CardGrid, EmptyState } from "@/components/layout/SharedLayouts";
import { BookOpen, Upload, FileText, Filter, ChevronDown } from "lucide-react";
import { requestUploadPrompt } from "@/app/lib/student-prompts";

interface SubjectGridProps {
  subjects: Subject[];
  subjectCounts: Record<string, number>;
}

export default function SubjectGrid({ subjects, subjectCounts }: SubjectGridProps) {
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const elementsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  const filteredSubjects = selectedSubject === "All" 
    ? subjects 
    : subjects.filter(sub => sub.name === selectedSubject);

  useEffect(() => {
    setActiveIndex(0);
    elementsRef.current = elementsRef.current.slice(0, filteredSubjects.length);
  }, [selectedSubject, filteredSubjects.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const totalItems = filteredSubjects.length;
    if (totalItems === 0) return;
    let newIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); newIndex = (index + 1) % totalItems; }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); newIndex = (index - 1 + totalItems) % totalItems; }
    else if (e.key === 'Home') { e.preventDefault(); newIndex = 0; }
    else if (e.key === 'End') { e.preventDefault(); newIndex = totalItems - 1; }
    if (newIndex !== index) { setActiveIndex(newIndex); elementsRef.current[newIndex]?.focus(); }
  };

  return (
    <>
      <div className="mb-6 flex">
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="motion-hover motion-focus h-11 w-full appearance-none cursor-pointer rounded-xl border border-border/60 bg-surface pl-10 pr-10 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
          >
            <option value="All">All Subjects</option>
            {subjects.map((sub) => (
              <option key={`filter-${sub.slug}`} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <ChevronDown className="size-4 text-muted-foreground opacity-50" />
          </div>
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <EmptyState
          title="No subjects match this filter"
          message="Start with all subjects, or upload notes for a class your batch needs."
          icon={BookOpen}
          action={
            <>
              <button onClick={() => setSelectedSubject("All")} className="motion-hover motion-active rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground hover:bg-surface-hover">
                Start Studying
              </button>
              <button onClick={requestUploadPrompt} className="motion-hover motion-active inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                <Upload size={15} /> Upload Notes
              </button>
            </>
          }
        />
      ) : (
        <CardGrid cols="5">
          {filteredSubjects.map((sub, index) => {
            const ui = SUBJECT_UI_MAP[sub.slug] || SUBJECT_UI_MAP["default"];
            const Icon = ui.icon;
            const count = subjectCounts[sub.name.toUpperCase()] || 0;
          
          return (
              <Link 
                key={sub.slug} 
                href={`/subject/${sub.slug}`}
                role="gridcell"
                ref={(el) => { if (el) elementsRef.current[index] = el; }}
                tabIndex={activeIndex === index ? 0 : -1}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="group motion-hover motion-active relative flex flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className={`absolute left-0 top-0 h-1 w-full ${ui.topBar || ui.color.replace('text-', 'bg-')}`} />
                <div className="w-full">
                  <div className={`mb-4 flex size-12 items-center justify-center rounded-xl ${ui.bg} ${ui.color} transition-transform group-hover:scale-110`}>
                    <Icon size={24} />
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-foreground">{sub.name}</h2>
                </div>
                
                <div className="mt-6">
                  {count > 0 ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">
                      <FileText size={14} />
                      <span>{count} resource{count !== 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 px-3 py-1 text-xs font-medium text-muted">
                      <div className="size-1.5 rounded-full bg-muted-foreground/50" />
                      <span>No resources yet</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </CardGrid>
      )}
    </>
  );
}
