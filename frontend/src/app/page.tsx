"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/api";
import { 
  Calculator, 
  Atom, 
  Terminal, 
  Leaf, 
  Wrench, 
  Beaker, 
  Zap, 
  PenTool, 
  BookOpen, 
  MessageSquare, 
  Globe, 
  Users 
} from "lucide-react";

const SUBJECTS = [
  { name: "MATHS 1", slug: "maths-1", icon: Calculator, color: "text-blue-500", bg: "bg-blue-500/10", hoverBg: "group-hover:bg-blue-500" },
  { name: "MATHS 2", slug: "maths-2", icon: Calculator, color: "text-blue-500", bg: "bg-blue-500/10", hoverBg: "group-hover:bg-blue-500" },
  { name: "PHYSICS", slug: "physics", icon: Atom, color: "text-amber-500", bg: "bg-amber-500/10", hoverBg: "group-hover:bg-amber-500" },
  { name: "BEE", slug: "bee", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10", hoverBg: "group-hover:bg-yellow-500" },
  { name: "PPS", slug: "pps", icon: Terminal, color: "text-indigo-500", bg: "bg-indigo-500/10", hoverBg: "group-hover:bg-indigo-500" },
  { name: "BIOLOGY", slug: "biology", icon: Leaf, color: "text-green-500", bg: "bg-green-500/10", hoverBg: "group-hover:bg-green-500" },
  { name: "WORKSHOP", slug: "workshop", icon: Wrench, color: "text-orange-500", bg: "bg-orange-500/10", hoverBg: "group-hover:bg-orange-500" },
  { name: "PHYSICS LAB", slug: "physics-lab", icon: Beaker, color: "text-amber-500", bg: "bg-amber-500/10", hoverBg: "group-hover:bg-amber-500" },
  { name: "CHEMISTRY", slug: "chemistry", icon: Beaker, color: "text-teal-500", bg: "bg-teal-500/10", hoverBg: "group-hover:bg-teal-500" },
  { name: "ENGINEERING GRAPHICS", slug: "engineering-graphics", icon: PenTool, color: "text-purple-500", bg: "bg-purple-500/10", hoverBg: "group-hover:bg-purple-500" },
  { name: "BE", slug: "be", icon: BookOpen, color: "text-rose-500", bg: "bg-rose-500/10", hoverBg: "group-hover:bg-rose-500" },
  { name: "BME", slug: "bme", icon: Wrench, color: "text-orange-500", bg: "bg-orange-500/10", hoverBg: "group-hover:bg-orange-500" },
  { name: "COMMUNICATION SKILLS", slug: "communication-skills", icon: MessageSquare, color: "text-pink-500", bg: "bg-pink-500/10", hoverBg: "group-hover:bg-pink-500" },
  { name: "ENVIRONMENTAL SCIENCE", slug: "environmental-science", icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10", hoverBg: "group-hover:bg-emerald-500" },
  { name: "NSS", slug: "nss", icon: Users, color: "text-red-500", bg: "bg-red-500/10", hoverBg: "group-hover:bg-red-500" },
  { name: "BEE LAB", slug: "bee-lab", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10", hoverBg: "group-hover:bg-yellow-500" },
  { name: "CHEMISTRY LAB", slug: "chemistry-lab", icon: Beaker, color: "text-teal-500", bg: "bg-teal-500/10", hoverBg: "group-hover:bg-teal-500" },
  { name: "BE LAB", slug: "be-lab", icon: BookOpen, color: "text-rose-500", bg: "bg-rose-500/10", hoverBg: "group-hover:bg-rose-500" }
];

export default function SubjectDirectory() {
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase.from('documents').select('subject').eq('status', 'approved');
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(doc => {
          const subj = doc.subject?.toUpperCase();
          if (subj) {
            counts[subj] = (counts[subj] || 0) + 1;
          }
        });
        setSubjectCounts(counts);
      }
    };
    fetchCounts();
  }, []);

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
        {filteredSubjects.map((sub) => {
          // Dynamically grab the icon or fallback to BookOpen
          const Icon = sub.icon || BookOpen;
          
          return (
            <Link 
              key={sub.slug} 
              href={`/subject/${sub.slug}`}
              className="group flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-indigo-400 hover:shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]"
            >
              {/* This is the fixed line injecting the specific colors and hover states */}
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${sub.bg || 'bg-[#4F46E5]/10'} ${sub.color || 'text-[#4F46E5]'} transition-transform group-hover:scale-110 ${sub.hoverBg || 'group-hover:bg-[#4F46E5]'} group-hover:text-white dark:text-[#6366F1]`}>
                <Icon size={24} />
              </div>
              <h2 className="text-xs font-bold tracking-tight text-[#111827] dark:text-white">{sub.name}</h2>
              <span className="mt-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-[#64748B] dark:bg-gray-800 dark:text-[#94A3B8]">
                {subjectCounts[sub.name] || 0} items
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}