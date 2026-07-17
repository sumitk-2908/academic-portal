import { useQuery } from '@tanstack/react-query';
import { getSubjects, Subject } from '@/app/lib/api/subjects';

export const useSubjects = () => {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: getSubjects,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

export const getIsNonModuleSubject = (subjects: Subject[], subjectName: string) => {
  const subject = subjects.find((s) => s.name === subjectName);
  return subject?.is_non_module ?? false;
};
