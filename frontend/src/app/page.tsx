"use client";

import { useState } from "react";
import Link from "next/link";

import { 
  Calculator, 
  Atom, 
  Terminal, 
  Leaf, 
  Beaker, 
  Wrench, 
  Zap, 
  PenTool, 
  Globe, 
  MessageSquare, 
  Users, 
  BookOpen 
} from "lucide-react";

// Expand the subjects array to include specific icons and Tailwind color classes
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
          const Icon = sub.icon;
          return (
            <Link 
              key={sub.slug} 
              href={`/subject/${sub.slug}`}
              className="group flex flex-col items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center transition-all hover:-translate-y-1 hover:border-[#4F46E5] hover:shadow-lg dark:border-[#1F2A44] dark:bg-[#111827]"
            >
              {/* Dynamic classes injected here for individual color accents */}
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${sub.bg} ${sub.color} transition-transform group-hover:scale-110 ${sub.hoverBg} group-hover:text-white`}>
                <Icon size={24} />
              </div>
              <h2 className="text-xs font-bold tracking-tight text-[#111827] dark:text-white">{sub.name}</h2>
            </Link>
          );
        })}
      </div>
    </div>
  );
}