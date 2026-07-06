import SubjectGrid from "@/components/SubjectGrid";
import { createClient } from "@/utils/supabase/server";

import { LandingHero } from "@/components/landing/LandingHero";

// Force Next.js to not cache this page since it contains user-specific greetings
export const dynamic = 'force-dynamic';

export default async function SubjectDirectory() {
  const supabase = await createClient();

  // 1. Fetch authenticated user and profile securely on the server
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userFavs: string[] = [];
  let firstName = "";

  if (session?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_subjects, full_name")
      .eq("id", session.user.id)
      .single();

    if (profile?.favorite_subjects) {
      userFavs = profile.favorite_subjects;
    }
    if (profile?.full_name) {
      firstName = profile.full_name.split(" ")[0];
    }
  }

  // 2. Fetch subjects
  const { data: dbSubjects } = await supabase
    .from("subjects")
    .select("*")
    .order("name");

  // 3. Fetch item counts mapped to each subject
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

  // 4. Server-Side Sorting: Favorites first, then alphabetical
  const sortedSubjects = [...subjects].sort((a, b) => {
    const aIsFav = userFavs.includes(a.name);
    const bIsFav = userFavs.includes(b.name);

    if (aIsFav && !bIsFav) return -1;
    if (!aIsFav && bIsFav) return 1;
    return a.name.localeCompare(b.name);
  });

  const isAuthenticated = !!session?.user;

  return (
    <div className="animate-fade-up mx-auto w-full max-w-6xl">
      {!isAuthenticated ? (
        <LandingHero />
      ) : (
        <section className="mb-10 pt-8 text-center">
          {firstName && (
            <div className="mb-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-surface/50 px-3 py-1 text-sm font-semibold tracking-wide text-muted shadow-sm backdrop-blur-sm">
                <span className="animate-pulse text-xl leading-none">👋</span>
                Welcome back, {firstName}
              </span>
            </div>
          )}
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground">
            Academic <span className="text-primary">Resource Hub</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl px-4 text-muted">
            Select a subject domain below to access modules, notes,
            assignments, and previous year questions.
          </p>
        </section>
      )}

      <section className={!isAuthenticated ? "border-t border-border pt-12" : ""}>
        {!isAuthenticated && (
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground">Explore Resources</h2>
            <p className="text-muted">Browse our collection of academic materials</p>
          </div>
        )}
        <SubjectGrid
          subjects={sortedSubjects}
          subjectCounts={counts}
        />
      </section>
    </div>
  );
}