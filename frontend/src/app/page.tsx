import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";
import HomeClient from "./HomeClient";
import { Suspense } from "react";
import { HomeSkeleton } from "@/components/layout/SharedLayouts";

export const metadata: Metadata = {
  title: {
    absolute: "Academic Resource Hub — Notes, PYQs & Study Materials for Engineering",
  },
  description: "Free notes, previous year questions, and study materials for 18+ engineering subjects. Crowd-sourced and peer-reviewed.",
  openGraph: {
    title: "Academic Resource Hub — Notes, PYQs & Study Materials for Engineering",
    description: "Free notes, previous year questions, and study materials for 18+ engineering subjects. Crowd-sourced and peer-reviewed.",
    url: "/",
  },
  twitter: {
    title: "Academic Resource Hub — Notes, PYQs & Study Materials for Engineering",
    description: "Free notes, previous year questions, and study materials for 18+ engineering subjects.",
  }
};

export const revalidate = 300;

export default async function Page() {
  const supabase = await createClient();

  // 1. Fetch subjects
  const { data: dbSubjects } = await supabase
    .from("subjects")
    .select("*")
    .order("name");

  // 2. Fetch item counts mapped to each subject
  const { data: countData } = await supabase.rpc("get_subject_counts");

  const counts: Record<string, number> = {};

  if (countData) {
    countData.forEach((row: any) => {
      if (row.subject) {
        counts[row.subject.toUpperCase()] = Number(row.count);
      }
    });
  }

  const subjects = dbSubjects || [];

  // 3. Fetch stats and trending globally (cacheable)
  const [{ count: modulesCount }, { data: analytics }, { data: recentDocs }] = await Promise.all([
    supabase.from("modules").select("*", { count: "exact", head: true }),
    supabase.from("document_analytics").select("view_count, download_count"),
    supabase.from("documents")
      .select("*, document_analytics(upvotes, view_count, download_count)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  const globalStats = {
    subjects: subjects.length,
    modules: modulesCount || 0,
    views: analytics?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0,
    downloads: analytics?.reduce((acc, curr) => acc + (curr.download_count || 0), 0) || 0,
  };
  
  const trendingDocs = recentDocs || [];

  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl">
      <Suspense fallback={<HomeSkeleton />}>
        <HomeClient 
          initialSubjects={subjects} 
          counts={counts} 
          globalStats={globalStats} 
          trendingDocs={trendingDocs} 
        />
      </Suspense>
    </div>
  );
}