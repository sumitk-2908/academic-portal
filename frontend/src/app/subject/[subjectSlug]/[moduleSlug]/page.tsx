import { supabase } from "@/app/lib/api";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DocumentInteractiveGrid from "@/components/subject/DocumentInteractiveGrid";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subjectSlug: string; moduleSlug: string }>;
}): Promise<Metadata> {
  const { subjectSlug, moduleSlug } = await params;
  const subjectName = subjectSlug.replace(/-/g, " ").toUpperCase();
  const moduleNumber = parseInt(moduleSlug.replace("module-", "")) || 1;

  return {
    title: `Module ${moduleNumber} - ${subjectName} | Academic Hub`,
    description: `Study materials and documents for Module ${moduleNumber} of ${subjectName}.`,
  };
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ subjectSlug: string; moduleSlug: string }>;
}) {
  const { subjectSlug, moduleSlug } = await params;
  const subjectName = subjectSlug.replace(/-/g, " ").toUpperCase();
  const moduleNumber = parseInt(moduleSlug.replace("module-", "")) || 1;

  const { data: dbSubject } = await supabase
    .from("subjects")
    .select("name")
    .eq("slug", subjectSlug)
    .single();

  const subjectDisplayName = dbSubject?.name || subjectName;

  const { data: documents, count } = await supabase
    .from("documents")
    .select("*", { count: "exact" })
    .eq("subject", subjectDisplayName)
    .eq("module_id", moduleNumber)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl animate-fade-up space-y-6">
      <Link
        href={`/subject/${subjectSlug}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={14} /> Back to {subjectDisplayName}
      </Link>

      <div className="border-b pb-4">
        <h1 className="text-xl font-extrabold sm:text-2xl">
          {subjectDisplayName}
        </h1>

        <p className="mt-1 text-xs font-bold text-primary">
          Module {moduleNumber} Repository ({count || 0} items)
        </p>
      </div>

      <DocumentInteractiveGrid
        initialDocuments={documents || []}
        subjectSlug={subjectSlug}
      />
    </div>
  );
}
