import type { Database } from "@/app/lib/database.types";

type DatabaseDocument = Database["public"]["Tables"]["documents"]["Row"];

export type DocumentRecord = Pick<
  DatabaseDocument,
  "id" | "title" | "category" | "subject" | "file_url"
> &
  Partial<Omit<DatabaseDocument, "id" | "title" | "category" | "subject" | "file_url">>;
export type DocumentAnalytics = Database["public"]["Tables"]["document_analytics"]["Row"];

export type DocumentWithAnalytics = DocumentRecord & {
  document_analytics?: Partial<DocumentAnalytics> | Partial<DocumentAnalytics>[] | null;
};

export type DocumentsPage = {
  data: DocumentRecord[];
  nextCursor: number | null;
  total: number;
};

export type InfiniteDocumentsData = {
  pages: DocumentsPage[];
  pageParams: unknown[];
};

export type StoredBookmark = number | Pick<DocumentRecord, "id">;
