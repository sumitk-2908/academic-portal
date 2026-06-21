import { supabase, getModulesBySubject } from "@/app/lib/api";
import SubjectTabs from "@/components/subject/SubjectTabs";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string }> }): Promise<Metadata> {
  const { subjectSlug } = await params;
  const displayTitle = subjectSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${displayTitle} | Academic Hub`,
    description: `Modules, notes, and previous year questions for ${displayTitle}.`,
  };
}

export default async function SubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const { subjectSlug } = await params;

  // Server-side fetching
  const { data: dbSubject } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', subjectSlug)
    .single();

  let modules: any[] = [];
  let moduleCounts: Record<number, number> = {};

  if (dbSubject && !dbSubject.is_non_module) {
    modules = await getModulesBySubject(dbSubject.id);

    const { data: countData } = await supabase
      .from('documents')
      .select('module_id')
      .eq('subject', dbSubject.name)
      .eq('status', 'approved');

    if (countData) {
      countData.forEach(doc => {
        if (doc.module_id) moduleCounts[doc.module_id] = (moduleCounts[doc.module_id] || 0) + 1;
      });
    }
  }

  const displayTitle = dbSubject?.name || subjectSlug.replace(/-/g, ' ').toUpperCase();

  return (
    <div className="space-y-6 animate-fade-up max-w-6xl mx-auto">
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
        <h1 className="text-xl font-extrabold sm:text-3xl">{displayTitle}</h1>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Core Subject Curricular Interface</p>
      </div>

      <SubjectTabs 
        subjectDetails={dbSubject || { name: displayTitle, is_non_module: false }} 
        modules={modules} 
        moduleCounts={moduleCounts} 
        subjectSlug={subjectSlug} 
      />
    </div>
  );
}