export const subjectSlug = (subject: string) => subject.toLowerCase().replace(/ /g, "-");

export type SearchDocument = {
  id: string | number;
  title: string;
  subject: string;
  module_id?: number | null;
  category?: string | null;
};

export const documentHref = (doc: SearchDocument) => `/subject/${subjectSlug(doc.subject)}/module-${doc.module_id || 1}/${doc.id}`;
