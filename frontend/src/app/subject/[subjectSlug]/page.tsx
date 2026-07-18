import { supabase } from "@/app/lib/api/core";
import { getCachedSubjectBySlug, getCachedModules, getCachedModuleCounts } from "@/app/lib/api/cached-subjects";
import SubjectTabs from "@/components/subject/SubjectTabs";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { Metadata } from "next";
import { Suspense } from "react";
import { SubjectPageSkeleton } from "@/components/layout/SharedLayouts";

export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string }> }): Promise<Metadata> {
  const { subjectSlug } = await params;
  const displayTitle = subjectSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const description = `Modules, notes, and previous year questions for ${displayTitle}.`;
  
  return {
    title: displayTitle,
    description: description,
    openGraph: {
      title: displayTitle,
      description: description,
      url: `/subject/${subjectSlug}`,
    },
    twitter: {
      title: displayTitle,
      description: description,
    }
  };
}

import Breadcrumb from "@/components/ui/Breadcrumb";

// New async component that handles the heavy lifting
async function SubjectTabsFetcher({ subjectSlug, displayTitle }: { subjectSlug: string, displayTitle: string }) {
  const dbSubject = await getCachedSubjectBySlug(subjectSlug);

  let modules: any[] = [];
  let moduleCounts: Record<number, number> = {};

  if (dbSubject && !dbSubject.is_non_module) {
    modules = await getCachedModules(dbSubject.id);
    moduleCounts = await getCachedModuleCounts(dbSubject.id);
  }

  return (
    <SubjectTabs
      subjectDetails={dbSubject ? { ...dbSubject, is_non_module: dbSubject.is_non_module ?? false } : { id: 0, slug: subjectSlug, name: displayTitle, is_non_module: false }}
      modules={modules}
      moduleCounts={moduleCounts}
      subjectSlug={subjectSlug}
    />
  );
}

export default async function SubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const { subjectSlug } = await params;

  // We can derive a display title instantly for the shell
  const displayTitle = subjectSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="animate-fade-up mx-auto max-w-6xl space-y-6">
      <Breadcrumb />
      <div className="flex min-h-[5.5rem] items-center rounded-3xl border border-border bg-surface px-6 py-4 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{displayTitle}</h1>
      </div>

      <ErrorBoundary
        title="Subject page could not load"
        message="The subject browser ran into a problem. Try going back and selecting the subject again."
      >
        <Suspense fallback={<SubjectPageSkeleton moduleView={false} />}>
          <SubjectTabsFetcher subjectSlug={subjectSlug} displayTitle={displayTitle} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}