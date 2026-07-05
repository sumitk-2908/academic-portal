"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  getStudentBookmarks,
  getFullStudyHistory,
  getSubjects,
  getStudyStreak,
  getAchievements,
  getEnhancedContributions,
} from "@/app/lib/api";
import { requestAuthPrompt } from "@/app/lib/auth-prompts";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { Activity, Flame, Loader2, Upload, User } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    subjects: 0,
    bookmarks: 0,
    uploads: 0,
    downloads: 0,
  });

  const [history, setHistory] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);

  // New Phase 3 States
  const [streak, setStreak] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      // 1. Get Auth Session
      const { data: sess } = await supabase.auth.getSession();
      const currentUser = sess?.session?.user;

      if (isMounted) {
        setUser(currentUser || null);
      }

      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 2. Fetch All Data Concurrently (Performance Optimized)
      const [
        userBookmarks,
        userHistory,
        allSubjects,
        userUploads,
        userStreak,
        userAchievements,
      ] = await Promise.all([
        getStudentBookmarks(currentUser.id),
        getFullStudyHistory(currentUser.id),
        getSubjects(),
        getEnhancedContributions(currentUser.id),
        getStudyStreak(currentUser.id),
        getAchievements(currentUser.id),
      ]);

      // 3. Update states only if the component is still mounted
      if (isMounted) {
        setBookmarks(userBookmarks || []);
        setHistory(userHistory || []);
        setUploads(userUploads || []);
        setStreak(userStreak);
        setAchievements(userAchievements || []);

        const totalImpact = (userUploads || []).reduce(
          (acc: number, u: any) => {
            return acc + (u.document_analytics?.download_count || 0);
          },
          0
        );

        setStats({
          subjects: allSubjects?.length || 0,
          bookmarks: userBookmarks?.length || 0,
          uploads: userUploads?.length || 0,
          downloads: totalImpact,
        });

        setLoading(false);
      }
    };

    // Initial fetch
    fetchDashboardData();

    window.addEventListener("sidebar_update", fetchDashboardData);
    window.addEventListener("focus", fetchDashboardData);

    return () => {
      isMounted = false;
      window.removeEventListener("sidebar_update", fetchDashboardData);
      window.removeEventListener("focus", fetchDashboardData);
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex h-64 w-full max-w-4xl items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl pb-12">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <User size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Open your profile</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
                Sign in to see your bookmarks, study streak, contribution history, and activity in one place.
              </p>
              <button onClick={() => requestAuthPrompt("profile")} className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground motion-hover motion-active hover:opacity-90">
                Open Profile
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <button onClick={() => requestAuthPrompt("studyStreak")} className="rounded-2xl border border-border bg-surface p-4 text-left shadow-sm motion-hover hover:border-primary/40">
            <Flame className="mb-3 text-warning" size={20} />
            <p className="text-sm font-bold text-foreground">Study Streak</p>
            <p className="mt-1 text-xs leading-5 text-muted">Keep your streak updated as you study.</p>
          </button>
          <button onClick={() => requestAuthPrompt("contributionHistory")} className="rounded-2xl border border-border bg-surface p-4 text-left shadow-sm motion-hover hover:border-primary/40">
            <Upload className="mb-3 text-success" size={20} />
            <p className="text-sm font-bold text-foreground">Contribution History</p>
            <p className="mt-1 text-xs leading-5 text-muted">Track uploads, approvals, and impact.</p>
          </button>
          <button onClick={() => requestAuthPrompt("activityGraph")} className="rounded-2xl border border-border bg-surface p-4 text-left shadow-sm motion-hover hover:border-primary/40">
            <Activity className="mb-3 text-primary" size={20} />
            <p className="text-sm font-bold text-foreground">Activity Graph</p>
            <p className="mt-1 text-xs leading-5 text-muted">Build your private study activity timeline.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl pb-12">
      <h1 className="mb-6 hidden text-2xl font-extrabold tracking-tight text-foreground sm:block">
        Student Profile
      </h1>

      {/* Passing the new streak state to the Header */}
      <ProfileHeader user={user} streak={streak} />

      <ProfileStats stats={stats} />

      {/* Passing new states to Tabs so they can render the Heatmap, Timeline, and Achievements */}
      <ProfileTabs
        user={user}
        history={history}
        bookmarks={bookmarks}
        uploads={uploads}
        achievements={achievements}
      />
    </div>
  );
}
