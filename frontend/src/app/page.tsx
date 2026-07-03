import SubjectGrid from "@/components/SubjectGrid";
import { createClient } from "@/utils/supabase/server";

// Force Next.js to revalidate this page if necessary, though caching is ideal.
export const revalidate = 3600; // Cache for 1 hour, or remove to make it fully dynamic

export default async function SubjectDirectory() {
  const supabase = await createClient();

  // 1. Fetch authenticated user and profile securely on the server
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let userFavs: string[] = [];

  if (session?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_subjects")
      .eq("id", session.user.id)
      .single();

    if (profile?.favorite_subjects) {
      userFavs = profile.favorite_subjects;
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

  return (
    <div className="mx-auto w-full max-w-6xl animate-fade-up">
      <section className="mb-10 pt-8 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Academic <span className="text-primary">Resource Hub</span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl px-4 text-muted">
          Select a subject domain below to access modules, notes,
          assignments, and previous year questions.
        </p>

        {/* Client Boundary starts here */}
        <SubjectGrid
          subjects={sortedSubjects}
          subjectCounts={counts}
        />
      </section>
    </div>
  );
}