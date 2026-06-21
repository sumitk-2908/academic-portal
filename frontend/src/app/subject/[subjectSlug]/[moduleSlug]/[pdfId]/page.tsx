import { supabase } from "@/app/lib/api";
import { Metadata } from "next";
// Standard import of the wrapper component
import PDFViewerWrapper from "@/components/pdf/PDFViewerWrapper"; 

// Generate dynamic SEO tags for Google/Social Previews
export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string, pdfId: string }> }): Promise<Metadata> {
  const { subjectSlug, pdfId } = await params;
  
  const { data: documentMeta } = await supabase
    .from('documents')
    .select('title, category, uploader_name')
    .eq('id', pdfId)
    .single();

  if (!documentMeta) return { title: 'Document Not Found' };

  const subjectName = subjectSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `${documentMeta.title} - ${subjectName} | Academic Hub`,
    description: `Download or view ${documentMeta.category} uploaded by ${documentMeta.uploader_name || 'a student'}.`,
    openGraph: {
      title: documentMeta.title,
      description: `View this document for ${subjectName}.`,
      type: 'article',
    }
  };
}

// Server Component
export default async function PDFViewerPage({ params }: { params: Promise<{ pdfId: string }> }) {
  const { pdfId } = await params;

  // Fetch the data once on the server and pass it down
  const { data: documentMeta } = await supabase
    .from('documents')
    .select('*')
    .eq('id', pdfId)
    .single();

  if (!documentMeta) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white shadow-sm dark:border-[#1F2A44] dark:bg-[#111827]">
        <p className="text-sm font-bold text-[#64748B]">Document not found or has been removed.</p>
      </div>
    );
  }

  // Use the wrapper to render the client logic
  return <PDFViewerWrapper documentMeta={documentMeta} />;
}