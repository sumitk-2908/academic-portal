import { getSubjects, getModulesBySubject, searchDocuments } from "../../lib/api";
import SubjectClientView from "./SubjectClientView";
import { Metadata } from "next";

// Next.js 15+ requires params to be typed as a Promise
type Props = {
  params: Promise<{ slug: string }>;
};

// 1. Generate dynamic SEO metadata for crawlers
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const formattedTitle = resolvedParams.slug.replace(/-/g, " ").toUpperCase();
  
  return {
    title: `${formattedTitle} Resources | Academic Portal`,
    description: `Download PYQs, Notes, and Syllabus for ${formattedTitle}.`,
  };
}

// 2. Generate static paths at build time
export async function generateStaticParams() {
  try {
    const subjects = await getSubjects();
    return subjects.map((subject) => ({
      slug: subject.slug,
    }));
  } catch (error) {
    return [];
  }
}

// 3. The Server Component
export default async function SubjectPage({ params }: Props) {
  const resolvedParams = await params;
  let subjects: any[] = [];
  let currentSubject: any = null;
  let modules: any[] = [];
  let initialDocs: any[] = [];

  try {
    subjects = await getSubjects();
    currentSubject = subjects.find(s => s.slug === resolvedParams.slug);

    if (currentSubject) {
       // Fetch modules if applicable
       if (!currentSubject.is_non_module) {
           modules = await getModulesBySubject(currentSubject.id);
       }
       
       // 🚀 FIX: Use your existing, verified API function instead of guessing the table name!
       const allDocs = await searchDocuments("");
       
       if (allDocs && Array.isArray(allDocs)) {
           // Filter the database results to match the current URL subject
           initialDocs = allDocs.filter((doc: any) => doc.subject === currentSubject.name);
       }
    }
  } catch (error) {
    console.error("Server component fetch error:", error);
  }

  return (
    <SubjectClientView 
      subjects={subjects} 
      modules={modules}
      initialDocs={initialDocs} 
      currentSubject={currentSubject} 
    />
  );
}