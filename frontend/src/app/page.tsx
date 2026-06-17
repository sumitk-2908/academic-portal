"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

const SUBJECTS = [
  { name: "MATHS 1", slug: "maths-1" },
  { name: "MATHS 2", slug: "maths-2" },
  { name: "PHYSICS", slug: "physics" },
  { name: "BEE", slug: "bee" },
  { name: "PPS", slug: "pps" },
  { name: "BIOLOGY", slug: "biology" },
  { name: "WORKSHOP", slug: "workshop" },
  { name: "PHYSICS LAB", slug: "physics-lab" },
  { name: "CHEMISTRY", slug: "chemistry" },
  { name: "ENGINEERING GRAPHICS", slug: "engineering-graphics" },
  { name: "BE", slug: "be" },
  { name: "BME", slug: "bme" },
  { name: "COMMUNICATION SKILLS", slug: "communication-skills" },
  { name: "ENVIRONMENTAL SCIENCE", slug: "environmental-science" },
  { name: "NSS", slug: "nss" },
  { name: "BEE LAB", slug: "bee-lab" },
  { name: "CHEMISTRY LAB", slug: "chemistry-lab" },
  { name: "BE LAB", slug: "be-lab" }
];

export default function SubjectDirectory() {
  const [selectedSubject, setSelectedSubject] = useState("All");

  // Filter subjects based on the dropdown selection
  const filteredSubjects = selectedSubject === "All" 
    ? SUBJECTS 
    : SUBJECTS.filter(sub => sub.name === selectedSubject);

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-up">
      <section className="mb-10 text-center pt-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
          Academic <span className="text-[#4F46E5]">Resource Hub</span>
        </h1>
        <p className="text-[#64748B] dark:text-[#94A3B8] max-w-2xl mx-auto mb-8 px-4">
          Select a subject domain below to access modules, notes, assignments, and previous year questions.
        </p>

        {/* --- ADDED DROPDOWN FILTER --- */}
        <div className="flex justify-center px-4 mb-4">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full max-w-xs cursor-pointer rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#111827] shadow-sm outline-none transition-colors focus:border-[#4F46E5] dark:border-[#1F2A44] dark:bg-[#111827] dark:text-white sm:max-w-sm"
          >
            <option value="All">All Subjects</option>
            {SUBJECTS.map((sub) => (
              <option key={`filter-${sub.slug}`} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 px-4 sm:px-0">
        {filteredSubjects.map((sub) => (
          <Link 
            key={sub.slug} 
            href={`/subject/${sub.slug}`}
            className="group flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-[#4F46E5] hover:shadow-lg dark:border-[#1F2A44] dark:bg-[#111827]"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5] transition-transform group-hover:scale-110 group-hover:bg-[#4F46E5] group-hover:text-white dark:text-[#6366F1]">
              <BookOpen size={24} />
            </div>
            <h2 className="text-xs font-bold tracking-tight text-[#111827] dark:text-white">{sub.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}