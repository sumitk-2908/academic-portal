"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase, getSubjects, Subject } from "./lib/api";
import { SUBJECT_UI_MAP } from "./lib/subject-config";

export default function SubjectDirectory() {
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const elementsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dbSubjects = await getSubjects();
        setSubjects(dbSubjects);
      } catch (e) {
        console.error("Failed to load subjects", e);
      }
      
      const { data, error } = await supabase.rpc('get_subject_counts');
      if (data && !error) {
        const counts: Record<string, number> = {};
        data.forEach((row: any) => {
          if (row.subject) {
            counts[row.subject.toUpperCase()] = Number(row.count);
          }
        });
        setSubjectCounts(counts);
      }
    };
    loadData();
  }, []);

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
    <div className="mx-auto w-full max-w-6xl animate-fade-up">
      <section className="mb-10 text-center pt-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
          Academic <span className="text-[#4F46E5]">Resource Hub</span>
        </h1>
        <p className="text-[#64748B] dark:text-[#94A3B8] max-w-2xl mx-auto mb-8 px-4">
          Select a subject domain below to access modules, notes, assignments, and previous year questions.
        </p>

        <div className="flex justify-center px-4 mb-4">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full max-w-xs cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] shadow-sm outline-none transition-colors focus:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#111827] dark:text-white sm:max-w-sm"
          >
            <option value="All">All Subjects</option>
            {subjects.map((sub) => (
              <option key={`filter-${sub.slug}`} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div role="grid" aria-label="Subjects Grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 px-4 sm:px-0">
        {filteredSubjects.map((sub, index) => {
          // Look up the visual styling from our config file based on the slug from the database
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
              className="group flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md dark:border-[#1F2A44] dark:bg-[#111827] dark:hover:border-indigo-400/60 dark:hover:bg-[#161f33]"
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${ui.bg} ${ui.color} transition-transform group-hover:scale-110 ${ui.hoverBg} group-hover:text-white`}>
                <Icon size={24} />
              </div>
              <h2 className="text-xs font-bold tracking-tight text-[#111827] dark:text-white">{sub.name}</h2>
              <span className="mt-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-[#64748B] dark:bg-gray-800 dark:text-[#94A3B8]">
                {subjectCounts[sub.name] || 0} items
              </span>
            </Link>
          );
        })}
        {subjects.length === 0 && (
           <p className="col-span-full text-center py-12 text-sm text-[#64748B]">Loading subjects...</p>
        )}
      </div>
    </div>
  );
}