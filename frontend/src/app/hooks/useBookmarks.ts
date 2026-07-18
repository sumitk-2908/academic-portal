import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudentBookmarks, toggleBookmarkAPI } from '@/app/lib/api/bookmarks';
import { dispatchToast } from '@/app/lib/toast';
import { DocumentWithAnalytics, DocumentRecord } from '@/app/lib/document-types';

export const useBookmarks = (userId?: string) => {
  return useQuery({
    queryKey: ['bookmarks', userId],
    queryFn: () => getStudentBookmarks(userId),
    enabled: true,
  });
};

export const useToggleBookmarkMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, documentId, isAdding, doc }: { userId: string, documentId: number, isAdding: boolean, doc?: DocumentRecord }) => {
      await toggleBookmarkAPI(userId, documentId, isAdding);
      return { userId, documentId, isAdding, doc };
    },
    onMutate: async ({ userId, documentId, isAdding, doc }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['bookmarks', userId] });

      // Snapshot the previous value
      const previousBookmarks = queryClient.getQueryData<DocumentRecord[]>(['bookmarks', userId]);

      // Optimistically update to the new value
      if (previousBookmarks) {
        queryClient.setQueryData<DocumentRecord[]>(['bookmarks', userId], (old) => {
          if (!old) return [];
          if (isAdding) {
            // We might not have the full document object here to optimistic append completely accurately, 
            // but normally the UI will fetch or we already have the doc in another query.
            // Wait, we usually toggle from a place where we already see the doc.
            // If we are adding, we can't easily fake the whole DocumentRecord here without passing it.
            // But if we're removing, we can easily filter it out.
            return old; // For adding, we might need to rely on invalidate if we don't have the doc.
          } else {
            return old.filter((doc) => doc.id !== documentId);
          }
        });
      }
      
      // Update local storage for offline support
      try {
        const stored = localStorage.getItem("portal_bookmarks");
        const parsed: any[] = stored ? JSON.parse(stored) : [];
        if (isAdding) {
          const exists = parsed.find(p => (typeof p === 'object' && 'id' in p ? p.id : p) === documentId);
          if (!exists) {
            parsed.push(doc ? { ...doc, bookmarked_at: new Date().toISOString() } : documentId);
          }
        } else {
          const index = parsed.findIndex(p => (typeof p === 'object' && 'id' in p ? p.id : p) === documentId);
          if (index > -1) parsed.splice(index, 1);
        }
        localStorage.setItem("portal_bookmarks", JSON.stringify(parsed));
      } catch (e) {
        console.error("Local storage error in optimistic update", e);
      }

      return { previousBookmarks };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBookmarks) {
        queryClient.setQueryData(['bookmarks', variables.userId], context.previousBookmarks);
      }
      
      // Revert local storage
      try {
        const stored = localStorage.getItem("portal_bookmarks");
        let parsed: any[] = stored ? JSON.parse(stored) : [];
        if (variables.isAdding) {
          parsed = parsed.filter(p => (typeof p === 'object' && 'id' in p ? p.id : p) !== variables.documentId);
        } else {
          const exists = parsed.find(p => (typeof p === 'object' && 'id' in p ? p.id : p) === variables.documentId);
          if (!exists) parsed.push(variables.doc ? { ...variables.doc, bookmarked_at: new Date().toISOString() } : variables.documentId);
        }
        localStorage.setItem("portal_bookmarks", JSON.stringify(parsed));
      } catch (e) {}

      dispatchToast("Error", "Failed to update bookmark.", "error");
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['bookmarks', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', undefined] }); // For non-logged in or generic fetches
    },
  });
};
