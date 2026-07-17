import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getProfilePreferences, 
  updateProfilePreferences, 
  getStudyStreak, 
  getAchievements, 
  getEnhancedContributions 
} from '@/app/lib/api/profile';

export const useProfilePreferences = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', 'preferences', userId],
    queryFn: () => getProfilePreferences(userId as string),
    enabled: !!userId,
  });
};

export const useStudyStreak = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', 'streak', userId],
    queryFn: () => getStudyStreak(userId as string),
    enabled: !!userId,
  });
};

export const useAchievements = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', 'achievements', userId],
    queryFn: () => getAchievements(userId as string),
    enabled: !!userId,
  });
};

export const useEnhancedContributions = (userId?: string) => {
  return useQuery({
    queryKey: ['profile', 'contributions', userId],
    queryFn: () => getEnhancedContributions(userId as string),
    enabled: !!userId,
  });
};

export const useUpdateProfilePreferencesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, preferences }: { userId: string, preferences: any }) => {
      await updateProfilePreferences(userId, preferences);
      return { userId, preferences };
    },
    onMutate: async ({ userId, preferences }) => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'preferences', userId] });
      const previousProfile = queryClient.getQueryData(['profile', 'preferences', userId]);
      
      queryClient.setQueryData(['profile', 'preferences', userId], (old: any) => {
        return { ...old, ...preferences };
      });
      
      return { previousProfile };
    },
    onError: (err, variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', 'preferences', variables.userId], context.previousProfile);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'preferences', variables.userId] });
    },
  });
};
