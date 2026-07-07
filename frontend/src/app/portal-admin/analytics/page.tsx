"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/api";
import { BarChart2, FileText, Download, ShieldAlert, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function AdminAnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocs: 0,
    approvedDocs: 0,
    pendingDocs: 0,
    rejectedDocs: 0,
    totalDownloads: 0,
    totalViews: 0,
    totalFlags: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);

      // Fetch Document counts by status
      const { data: docData } = await supabase
        .from("documents")
        .select("status");

      let total = 0, approved = 0, pending = 0, rejected = 0;
      if (docData) {
        total = docData.length;
        docData.forEach((d: any) => {
          if (d.status === "approved") approved++;
          if (d.status === "pending") pending++;
          if (d.status === "rejected") rejected++;
        });
      }

      // Fetch analytics counts
      const { data: analyticsData } = await supabase
        .from("document_analytics")
        .select("download_count, view_count");

      let downloads = 0, views = 0;
      if (analyticsData) {
        analyticsData.forEach((a: any) => {
          downloads += a.download_count || 0;
          views += a.view_count || 0;
        });
      }

      // Fetch flags count
      const { count: flagsCount } = await supabase
        .from("document_flags")
        .select("*", { count: 'exact', head: true });

      setStats({
        totalDocs: total,
        approvedDocs: approved,
        pendingDocs: pending,
        rejectedDocs: rejected,
        totalDownloads: downloads,
        totalViews: views,
        totalFlags: flagsCount || 0,
      });

      setLoading(false);
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <InlineSpinner label="Loading analytics..." size={24} />
      </div>
    );
  }

  return (
    <main className="animate-fade-up mx-auto w-full max-w-6xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link href="/subject/admin/inbox" className="motion-hover inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary">
          <ArrowLeft size={14} /> Back to Inbox
        </Link>
      </div>

      <section className="premium-transition flex items-center gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <div className="premium-transition flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BarChart2 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="mt-0.5 text-xs font-semibold tracking-wider text-primary">
            Platform-wide metrics and content health.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 text-muted">
            <FileText size={20} />
            <span className="text-sm font-bold">Total Documents</span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-foreground">{stats.totalDocs}</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 text-success">
            <CheckCircle size={20} />
            <span className="text-sm font-bold">Approved</span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-foreground">{stats.approvedDocs}</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 text-warning">
            <ShieldAlert size={20} />
            <span className="text-sm font-bold">Pending Review</span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-foreground">{stats.pendingDocs}</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 text-primary">
            <Download size={20} />
            <span className="text-sm font-bold">Total Downloads</span>
          </div>
          <p className="mt-4 text-3xl font-extrabold text-foreground">{stats.totalDownloads}</p>
        </div>
      </div>
      
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
         <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
           <h3 className="text-lg font-bold text-foreground">Content Engagement</h3>
           <div className="mt-4 space-y-4">
             <div className="flex items-center justify-between border-b border-border pb-2">
               <span className="text-sm text-muted">Total Views</span>
               <span className="font-bold text-foreground">{stats.totalViews}</span>
             </div>
             <div className="flex items-center justify-between border-b border-border pb-2">
               <span className="text-sm text-muted">Total Downloads</span>
               <span className="font-bold text-foreground">{stats.totalDownloads}</span>
             </div>
           </div>
         </div>
         
         <div className="rounded-2xl border border-destructive/20 bg-surface p-6 shadow-sm">
           <h3 className="text-lg font-bold text-foreground">Moderation Health</h3>
           <div className="mt-4 space-y-4">
             <div className="flex items-center justify-between border-b border-border pb-2">
               <span className="text-sm text-muted">Total Flags</span>
               <span className="font-bold text-destructive">{stats.totalFlags}</span>
             </div>
             <div className="flex items-center justify-between border-b border-border pb-2">
               <span className="text-sm text-muted">Rejected Documents</span>
               <span className="font-bold text-foreground">{stats.rejectedDocs}</span>
             </div>
           </div>
         </div>
      </div>
    </main>
  );
}

export default function AdminAnalyticsRoute() {
  return (
    <ErrorBoundary
      title="Analytics could not load"
      message="The analytics dashboard ran into a problem."
    >
      <AdminAnalyticsContent />
    </ErrorBoundary>
  );
}
