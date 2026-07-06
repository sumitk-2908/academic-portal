import { MetadataRoute } from 'next';
import { createClient } from '@/utils/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = await createClient();
  
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  // Fetch approved documents to extract subjects, modules, and document IDs
  const { data: documents } = await supabase
    .from('documents')
    .select('id, subject, module_id, updated_at')
    .eq('status', 'approved');

  if (documents && documents.length > 0) {
    const subjects = new Set<string>();
    const modulesBySubject = new Map<string, Set<number>>();
    
    documents.forEach((doc) => {
      if (doc.subject) {
        subjects.add(doc.subject);
        
        if (!modulesBySubject.has(doc.subject)) {
          modulesBySubject.set(doc.subject, new Set());
        }
        
        if (doc.module_id) {
          modulesBySubject.get(doc.subject)!.add(doc.module_id);
        }
        
        // Add individual document route
        routes.push({
          url: `${baseUrl}/subject/${doc.subject}/module-${doc.module_id}/${doc.id}`,
          lastModified: new Date(doc.updated_at || Date.now()),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    });

    // Add subject routes
    subjects.forEach((subject) => {
      routes.push({
        url: `${baseUrl}/subject/${subject}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });

      // Add module routes
      const modules = modulesBySubject.get(subject);
      if (modules) {
        modules.forEach((moduleId) => {
          routes.push({
            url: `${baseUrl}/subject/${subject}/module-${moduleId}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        });
      }
    });
  }

  return routes;
}
