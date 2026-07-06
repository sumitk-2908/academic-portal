"use client";

import Link from "next/link";
import { Home, Inbox, Clock, Bookmark, Upload, TrendingUp } from "lucide-react";
import { ClientLayoutContext } from "@/app/hooks/useClientLayout";
import ProfileSidebarCard from "@/components/profile/ProfileSidebarCard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { SidebarSkeleton } from "@/components/layout/SharedLayouts";
import { documentHref, SearchDocument } from "@/components/layout/utils";

export const SidebarNavigation = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <div className="flex-1 space-y-6">
    {ctx.sidebarLoading ? (
      <SidebarSkeleton collapsed={ctx.sidebarCollapsed} />
    ) : (
    <>
    <div>
      {!ctx.sidebarCollapsed && <p className="px-3 pb-2 text-xs font-bold tracking-[0.06em] text-muted uppercase">Navigation</p>}
      <Link 
        href="/" 
        title={ctx.sidebarCollapsed ? "Back to Homepage" : undefined} 
        className={`motion-hover motion-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          ctx.pathname === '/' 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted hover:bg-surface-hover hover:text-primary'
        }`}
      >
        <Home size={18} /> {!ctx.sidebarCollapsed && "Back to Homepage"}
      </Link>
      
      {ctx.isAdmin && (
        <Link 
          href="/subject/admin/inbox" 
          title={ctx.sidebarCollapsed ? "Approval Inbox" : undefined} 
          className={`motion-hover motion-active mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            ctx.pathname === '/subject/admin/inbox'
              ? 'bg-warning/10 text-warning'
              : 'text-warning hover:bg-warning/10'
          }`}
        >
          <Inbox size={18} /> {!ctx.sidebarCollapsed && <span className="flex-1">Approval Inbox</span>}
          {!ctx.sidebarCollapsed && ctx.pendingCount > 0 && <span className="rounded-full bg-warning/20 px-2 text-xs tracking-[0.06em]">{ctx.pendingCount}</span>}
        </Link>
      )}
    </div>

    <div>
      {!ctx.sidebarCollapsed && <p className="px-3 pb-2 text-xs font-bold tracking-[0.06em] text-muted uppercase">Student Workspace</p>}
      {(ctx.isAdmin || ctx.isStudent) ? (
        <Link
          href="/continue-studying"
          title={ctx.sidebarCollapsed ? "Continue Studying" : undefined}
          className={`motion-hover motion-active flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            ctx.pathname === '/continue-studying'
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-surface-hover hover:text-primary'
          }`}
        >
          <Clock size={18} /> {!ctx.sidebarCollapsed && "Continue Studying"}
        </Link>
      ) : (
        <button
          type="button"
          title={ctx.sidebarCollapsed ? "Continue Studying" : undefined}
          onClick={() => ctx.openAuthPrompt("continueStudying")}
          className="motion-hover motion-active flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-primary"
        >
          <Clock size={18} /> {!ctx.sidebarCollapsed && "Continue Studying"}
        </button>
      )}
      {(ctx.isAdmin || ctx.isStudent) ? (
        <Link
          href="/bookmarks"
          title={ctx.sidebarCollapsed ? "Bookmarks" : undefined}
          className={`motion-hover motion-active mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            ctx.pathname === '/bookmarks'
              ? 'bg-warning/10 text-warning'
              : 'text-muted hover:bg-surface-hover hover:text-warning'
          }`}
        >
          <Bookmark size={18} /> {!ctx.sidebarCollapsed && "Bookmarks"}
        </Link>
      ) : (
        <button
          type="button"
          title={ctx.sidebarCollapsed ? "Bookmarks" : undefined}
          onClick={() => ctx.openAuthPrompt("bookmark")}
          className="motion-hover motion-active mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-warning"
        >
          <Bookmark size={18} /> {!ctx.sidebarCollapsed && "Bookmarks"}
        </button>
      )}
      <Link 
        href="/recent-uploads" 
        title={ctx.sidebarCollapsed ? "Recent Uploads" : undefined} 
        className={`motion-hover motion-active mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          ctx.pathname === '/recent-uploads'
            ? 'bg-success/10 text-success'
            : 'text-muted hover:bg-surface-hover hover:text-success'
        }`}
      >
        <Upload size={18} /> {!ctx.sidebarCollapsed && "Recent Uploads"}
      </Link>
    </div>

    <ErrorBoundary title="Trending section could not load" className="mt-2" message="Trending docs failed to load.">
      {!ctx.sidebarCollapsed && ctx.trendingDocs.length > 0 && (
        <div>
          <p className="px-3 pb-2 text-xs font-bold tracking-[0.06em] text-muted uppercase">Discovery</p>
          <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2 text-primary"><TrendingUp size={13} /><h3 className="text-xs font-extrabold tracking-[0.06em] uppercase">Trending Now</h3></div>
            {ctx.trendingDocs.slice(0, 5).map((doc: SearchDocument, idx: number) => (
              <Link key={`tr-${doc.id}`} href={documentHref(doc)} className="group block text-xs">
                <p className="truncate font-bold text-foreground transition-colors group-hover:text-primary">{idx + 1}. {doc.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </ErrorBoundary>
    </>
    )}
  </div>
);

export const SidebarFooter = ({ ctx }: { ctx: ClientLayoutContext }) => {
  if (ctx.sidebarCollapsed) return null;
  
  let roleDisplay = "Student Account";
  if (ctx.isAdmin) {
    roleDisplay = "Administrator";
  } else if (ctx.userProfile) {
    if (ctx.userProfile.academic_year && ctx.userProfile.preferred_branch) {
      roleDisplay = `${ctx.userProfile.academic_year} · ${ctx.userProfile.preferred_branch}`;
    } else if (ctx.userProfile.preferred_branch) {
      roleDisplay = ctx.userProfile.preferred_branch;
    } else if (ctx.userProfile.academic_year) {
      roleDisplay = ctx.userProfile.academic_year;
    }
  }

  return (
    <div className="mt-auto flex flex-col pt-4">
      {(ctx.isAdmin || ctx.isStudent) && (
        <ProfileSidebarCard userName={ctx.uploadedBy || (ctx.isAdmin ? "Admin" : "Student")} role={roleDisplay} />
      )}
      <div className="mt-3 space-y-0.5 border-t border-border px-3 pt-4 text-xs font-medium tracking-[0.06em] text-muted">
        <p>Academic Portal • Version 1.6</p>
        <p>© {new Date().getFullYear()} All Rights Reserved.</p>
      </div>
    </div>
  );
};

export const Sidebar = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <aside aria-label="Main Desktop Navigation" className={`motion-sidebar sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-border bg-background py-6 lg:flex ${ctx.sidebarCollapsed ? 'w-16 px-2' : 'w-[220px] px-4'}`}>
    <SidebarNavigation ctx={ctx} />
    <SidebarFooter ctx={ctx} />
  </aside>
);
