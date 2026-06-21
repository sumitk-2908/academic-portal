import { supabase } from "@/app/lib/api";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DocumentInteractiveGrid from "@/components/subject/DocumentInteractiveGrid";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string }> }): Promise<Metadata> {
  const { subjectSlug, moduleSlug } = await params;
  const subjectName = subjectSlug.replace(/-/g, ' ').toUpperCase();
  const moduleNumber = parseInt(moduleSlug.replace('module-', '')) || 1;
  return {
    title: `Module ${moduleNumber} - ${subjectName} | Academic Hub`,
    description: `Study materials and documents for Module ${moduleNumber} of ${subjectName}.`,
  };
}

export default async function ModulePage({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string }> }) {
  const { subjectSlug, moduleSlug } = await params;
  const subjectName = subjectSlug.replace(/-/g, ' ').toUpperCase();
  const moduleNumber = parseInt(moduleSlug.replace('module-', '')) || 1;

  // Server-side fetching
  const { data: documents } = await supabase.from('documents')
    .select('*')
    .ilike('subject', subjectName)
    .eq('module_id', moduleNumber)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-up">
      <Link href={`/subject/${subjectSlug}`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
        <ArrowLeft size={14} /> Back to {subjectName}
      </Link>

      <div className="border-b pb-4 dark:border-[#1F2A44]">
        <h1 className="text-xl font-extrabold sm:text-2xl">{subjectName}</h1>
        <p className="mt-1 text-xs font-bold text-[#4F46E5]">Module {moduleNumber} Repository</p>
      </div>

      <DocumentInteractiveGrid 
        initialDocuments={documents || []} 
        subjectSlug={subjectSlug} 
      />
    </div>
  );
}