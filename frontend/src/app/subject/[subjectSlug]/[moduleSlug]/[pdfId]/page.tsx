import { supabase } from "@/app/lib/api";
import { Metadata } from "next";
// Standard import of the wrapper component
import PDFViewerWrapper from "@/components/pdf/PDFViewerWrapper";

// Generate dynamic SEO tags for Google/Social Previews
export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string, pdfId: string }> }): Promise<Metadata> {
  const { subjectSlug, pdfId } = await params;

  const { data: documentMeta } = await supabase
    .from("documents")
    .select("title, category, uploader_name")
    .eq("id", pdfId)
    .single();

  if (!documentMeta) return { title: "Document Not Found" };

  const subjectName = subjectSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `${documentMeta.title} - ${subjectName} | Academic Hub`,
    description: `Download or view ${documentMeta.category} uploaded by ${documentMeta.uploader_name || "a student"}.`,
    openGraph: {
      title: documentMeta.title,
      description: `View this document for ${subjectName}.`,
      type: "article",
    }
  };
}

import Breadcrumb from "@/components/ui/Breadcrumb";

// Server Component
export default async function PDFViewerPage({ params }: { params: Promise<{ pdfId: string }> }) {
  const { pdfId } = await params;

  // Fetch the data once on the server and pass it down
  const { data: documentMeta } = await supabase
    .from("documents")
    .select("*, document_analytics(upvotes, view_count, download_count)")
    .eq("id", pdfId)
    .single();

  if (!documentMeta) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center rounded-3xl border border-border bg-surface shadow-sm">
        <p className="text-sm font-bold text-muted">
          Document not found or has been removed.
        </p>
      </div>
    );
  }

  // Use the wrapper to render the client logic
  return (
    <div className="mx-auto flex max-w-6xl flex-col space-y-4">
      <Breadcrumb />
      <PDFViewerWrapper documentMeta={documentMeta} />
    </div>
  );
}