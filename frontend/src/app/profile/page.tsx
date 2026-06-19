"use client";

import { useEffect, useState } from "react";
import { supabase, getStudentBookmarks, getRecentStudyActivity, getSubjects } from "@/app/lib/api";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ subjects: 0, bookmarks: 0, uploads: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      // 1. Get Auth Session
      const { data: sess } = await supabase.auth.getSession();
      const currentUser = sess?.session?.user;
      
      if (isMounted) {
        setUser(currentUser || null);
      }

      // 2. Fetch Aggregated Data
      const [userBookmarks, userHistory, allSubjects] = await Promise.all([
        getStudentBookmarks(currentUser?.id),
        getRecentStudyActivity(currentUser?.id),
        getSubjects()
      ]);

      // 3. Check for existing upload contributions
      let userUploads: any[] = [];
      if (currentUser?.id) {
        const { data } = await supabase
          .from('documents')
          .select('*')
          .eq('uploaded_by', currentUser.id)
          .order('created_at', { ascending: false });
          
        if (data) userUploads = data;
      }

      // 4. Update states only if the component is still mounted
      if (isMounted) {
        setBookmarks(userBookmarks || []);
        setHistory(userHistory || []);
        setUploads(userUploads);
        setStats({
          subjects: allSubjects?.length || 0,
          bookmarks: userBookmarks?.length || 0,
          uploads: userUploads.length || 0
        });
        setLoading(false);
      }
    };

    // Initial fetch
    fetchDashboardData();

    // 5. Listeners to keep profile in sync without refreshing the page!
    // (e.g., if user bookmarks an item in a different tab or sidebar)
    window.addEventListener("sidebar_update", fetchDashboardData);
    window.addEventListener("focus", fetchDashboardData);

    // 6. Cleanup function
    return () => {
      isMounted = false;
      window.removeEventListener("sidebar_update", fetchDashboardData);
      window.removeEventListener("focus", fetchDashboardData);
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl w-full">
      <h1 className="mb-6 hidden text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:block">
        Student Profile
      </h1>
      
      <ProfileHeader user={user} />
      <ProfileStats stats={stats} />
      <ProfileTabs history={history} bookmarks={bookmarks} uploads={uploads} />
    </div>
  );
}