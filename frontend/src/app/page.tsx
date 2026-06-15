import { redirect } from 'next/navigation';
import { getSubjects } from './lib/api';

export default async function RootPage() {
  let subjects = [];

  // 1. Only wrap the actual database call in the try...catch
  try {
    subjects = await getSubjects();
  } catch (error) {
    console.error("Failed to fetch subjects for root redirect:", error);
    
    // Fallback UI if the Supabase connection genuinely fails
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 bg-[#FAFAF9] dark:bg-[#0B1020]">
        <p className="text-sm font-bold text-red-500">Database Connection Error</p>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Could not load the academic portal.</p>
      </div>
    );
  }

  // 2. Perform the redirect OUTSIDE the try...catch block!
  if (subjects && subjects.length > 0) {
    redirect(`/subject/${subjects[0].slug}`);
  }

  // Fallback UI if your database connects but has 0 subjects
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAFAF9] dark:bg-[#0B1020]">
      <p className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
        No subjects found in the database. Please add a subject first.
      </p>
    </div>
  );
}