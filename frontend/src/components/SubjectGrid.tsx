"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Subject } from "@/app/lib/api"; 
import { SUBJECT_UI_MAP } from "@/app/lib/subject-config";

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
      <div className="flex justify-center px-4 mb-4">
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full max-w-xs cursor-pointer rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground shadow-sm outline-none motion-hover motion-focus focus:border-primary sm:max-w-sm"
        >
          <option value="All">All Subjects</option>
          {subjects.map((sub) => (
            <option key={`filter-${sub.slug}`} value={sub.name}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      <div role="grid" aria-label="Subjects Grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 px-4 sm:px-0">
        {filteredSubjects.map((sub, index) => {
          // Note: ui.bg, ui.color, and ui.hoverBg are external tailwind dependencies driven by subject-config.ts
          // These may still contain hardcoded tailwind values depending on that file's contents, but they are logically separated.
          const ui = SUBJECT_UI_MAP[sub.slug] || SUBJECT_UI_MAP["default"];
          const Icon = ui.icon;
          
          return (
            <Link 
              key={sub.slug} 
              href={`/subject/${sub.slug}`}
              role="gridcell"
              ref={(el) => { if (el) elementsRef.current[index] = el; }}
              tabIndex={activeIndex === index ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="group flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-6 text-center motion-hover motion-active hover:-translate-y-1 hover:border-primary/60 hover:bg-surface-hover hover:shadow-md"
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${ui.bg} ${ui.color} motion-hover group-hover:scale-110 ${ui.hoverBg} group-hover:text-white`}>  
                <Icon size={24} />
              </div>
              <h2 className="text-xs font-bold tracking-tight text-foreground">{sub.name}</h2>
              <span className="mt-2 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold text-muted">
                {subjectCounts[sub.name.toUpperCase()] || 0} items
              </span>
            </Link>
          );
        })}
        {subjects.length === 0 && (
           <p className="col-span-full text-center py-12 text-sm text-muted">No subjects found.</p>
        )}
      </div>
    </>
  );
}