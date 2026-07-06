"use client";

import { useEffect, useState, useRef } from "react";
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
import { Activity, Flame, Upload, User as UserIcon } from "lucide-react";
import { ProfileSkeleton } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { DocumentWithAnalytics } from "@/app/lib/document-types";
import { Tables } from "@/app/lib/database.types";
import { User } from "@supabase/supabase-js";

function ProfileContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    subjects: 0,
    bookmarks: 0,
    uploads: 0,
    downloads: 0,
  });

  const [history, setHistory] = useState<DocumentWithAnalytics[]>([]);
  const [bookmarks, setBookmarks] = useState<DocumentWithAnalytics[]>([]);
  const [uploads, setUploads] = useState<DocumentWithAnalytics[]>([]);

  // New Phase 3 States
  const [streak, setStreak] = useState<Tables<'study_streaks'> | null>(null);
  const [achievements, setAchievements] = useState<Tables<'user_achievements'>[]>([]);

  const lastFetchTime = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      const now = Date.now();
      if (now - lastFetchTime.current < 2000) return;
      lastFetchTime.current = now;
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
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl pb-12">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UserIcon size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Open your profile</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 font-medium text-muted">
                Sign in to see your bookmarks, study streak, contribution history, and activity in one place.
              </p>
              <button onClick={() => requestAuthPrompt("profile")} className="motion-hover motion-active mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
                Open Profile
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <button onClick={() => requestAuthPrompt("studyStreak")} className="motion-hover rounded-2xl border border-border bg-surface p-4 text-left shadow-sm hover:border-primary/40">
            <Flame className="mb-3 text-warning" size={20} />
            <p className="text-sm font-bold text-foreground">Study Streak</p>
            <p className="mt-1 text-xs leading-5 text-muted">Keep your streak updated as you study.</p>
          </button>
          <button onClick={() => requestAuthPrompt("contributionHistory")} className="motion-hover rounded-2xl border border-border bg-surface p-4 text-left shadow-sm hover:border-primary/40">
            <Upload className="mb-3 text-success" size={20} />
            <p className="text-sm font-bold text-foreground">Contribution History</p>
            <p className="mt-1 text-xs leading-5 text-muted">Track uploads, approvals, and impact.</p>
          </button>
          <button onClick={() => requestAuthPrompt("activityGraph")} className="motion-hover rounded-2xl border border-border bg-surface p-4 text-left shadow-sm hover:border-primary/40">
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

export default function ProfilePage() {
  return (
    <ErrorBoundary
      title="Profile could not load"
      message="Your profile workspace ran into a problem. Retry this section while the rest of the portal stays available."
    >
      <ProfileContent />
    </ErrorBoundary>
  );
}
