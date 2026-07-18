import { supabase } from "@/app/lib/api/core";
import { Metadata } from "next";
// Standard import of the wrapper component
import PDFViewerWrapper from "@/components/pdf/PDFViewerWrapper";

// Generate dynamic SEO tags for Google/Social Previews
export async function generateMetadata({ params }: { params: Promise<{ subjectSlug: string, moduleSlug: string, pdfId: string }> }): Promise<Metadata> {
  const { subjectSlug, moduleSlug, pdfId } = await params;

  const { data: documentMeta } = await supabase
    .from("documents")
    .select("title, category, uploader_name")
    .eq("id", parseInt(pdfId, 10))
    .single();

  if (!documentMeta) return { title: "Document Not Found" };

  const subjectName = subjectSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `${documentMeta.title} - ${subjectName}`,
    description: `Download or view ${documentMeta.category} uploaded by ${documentMeta.uploader_name || "a student"}.`,
    openGraph: {
      title: documentMeta.title,
      description: `View this document for ${subjectName}.`,
      type: "article",
      url: `/subject/${subjectSlug}/${moduleSlug}/${pdfId}`,
      images: [{ url: "/icon-512x512.png" }],
    },
    twitter: {
      title: documentMeta.title,
      description: `View this document for ${subjectName}.`,
    }
  };
}

import Breadcrumb from "@/components/ui/Breadcrumb";
import { CommentSection } from "@/components/comments/CommentSection";

// Server Component
export default async function PDFViewerPage({ params }: { params: Promise<{ pdfId: string }> }) {
  const { pdfId } = await params;

  // Fetch the data once on the server and pass it down
  const { data: documentMeta } = await supabase
    .from("documents")
    .select("*, document_analytics(upvotes, view_count, download_count)")
    .eq("id", parseInt(pdfId, 10))
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
    <div className="mx-auto flex max-w-[90rem] flex-col space-y-4">
      <Breadcrumb />
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="w-full flex-1 min-w-0">
          <PDFViewerWrapper documentMeta={documentMeta} />
        </div>
        <div 
          className="w-full shrink-0 lg:sticky lg:top-[5.5rem] lg:w-[400px] xl:w-[450px]" 
          style={{ height: 'calc(100vh - 6.5rem)' }}
        >
          <CommentSection documentId={documentMeta.id} />
        </div>
      </div>
    </div>
  );
}