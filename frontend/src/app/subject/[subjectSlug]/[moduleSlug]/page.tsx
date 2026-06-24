import { getPaginatedDocumentsByModule } from "@/app/lib/api";
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

  // 1. Fetch only Page 1 on the server using the NEW function
  const initialData = await getPaginatedDocumentsByModule(moduleNumber, 1, 20);

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-up">
      <Link href={`/subject/${subjectSlug}`} className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#4F46E5]">
        <ArrowLeft size={14} /> Back to {subjectName}
      </Link>

      <div className="border-b pb-4 dark:border-[#1F2A44]">
        <h1 className="text-xl font-extrabold sm:text-2xl">{subjectName}</h1>
        <p className="mt-1 text-xs font-bold text-[#4F46E5]">Module {moduleNumber} Repository ({initialData.total} items)</p>
      </div>

      <DocumentInteractiveGrid 
        initialDocuments={initialData.data} 
        subjectSlug={subjectSlug} 
        // 2. Pass this config to activate React Query Infinite Scroll
        paginationConfig={{
          queryKey: ['moduleDocs', subjectSlug, String(moduleNumber)],
          moduleId: moduleNumber
        }}
      />
    </div>
  );
}