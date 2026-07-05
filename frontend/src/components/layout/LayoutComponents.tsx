"use client";

import { useState,useEffect } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Toast from "@radix-ui/react-toast";
import { 
  GraduationCap, Search, Moon, Sun, LogOut, PanelLeft, PanelLeftClose, TrendingUp, X, 
  BookOpen, Bookmark, Clock, Upload, Inbox, Plus, FileText, Home, Menu, Mail, Loader2, 
  User, Settings, Info, Phone, AlertTriangle, Medal, Activity, Bell, CheckCheck, WifiOff
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { ClientLayoutContext, SUBJECTS_LIST, isNonModuleSubject } from "@/app/hooks/useClientLayout";
import { AUTH_PROMPT_COPY } from "@/app/lib/auth-prompts";
import { requestUploadPrompt } from "@/app/lib/student-prompts";
import ProfileDropdown from "@/components/profile/ProfileDropdown";
import ProfileSidebarCard from "@/components/profile/ProfileSidebarCard";
import UploadProgressBar from "@/components/ui/UploadProgressBar";
import AchievementToast from "@/components/ui/AchievementToast";
import { supabase } from "@/app/lib/api";

// 1. App Shell & Content Area
export const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-[100dvh] flex-col transition-colors duration-300 ease-premium bg-background text-foreground">{children}</div>
);

export const ContentArea = ({ children }: { children: React.ReactNode }) => (
  <main className="flex-1 w-full min-w-0 p-4 md:p-6 lg:p-8 overflow-x-clip pb-24 lg:pb-8">{children}</main>
);

// 2. Top Bar (Header)
export const TopBar = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
    <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 md:px-6">
      
      <div className="flex shrink-0 items-center gap-2.5">
        <button onClick={() => ctx.setSidebarCollapsed(!ctx.sidebarCollapsed)} className="hidden rounded-xl p-2 text-muted hover:bg-surface-hover lg:inline-flex">
          {ctx.sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap size={20} />
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-extrabold tracking-tight">Academic Portal</p>
          </div>
        </Link>
      </div>

      <div className="flex flex-1 justify-center min-w-0 relative group">
        <div className="w-full max-w-2xl relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search everything..."
            value={ctx.searchQuery}
            onChange={(e) => ctx.setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border border-border bg-surface-hover pl-11 pr-10 text-sm outline-none motion-hover motion-focus focus:border-primary focus:bg-surface text-foreground"
          />
          {ctx.searchQuery && (
            <button onClick={() => ctx.setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
              <X size={14} />
            </button>
          )}

          {ctx.searchQuery && (
            <div className="absolute top-12 left-0 w-full rounded-2xl border border-border bg-surface p-2 shadow-2xl z-50">
              <p className="px-3 py-2 text-xs tracking-[0.06em] font-bold uppercase text-muted">Global Search Results</p>
              {ctx.isSearching ? (
                <p className="p-4 text-xs text-center text-muted">Searching...</p>
              ) : (
                <>
                  {ctx.globalSearchResults.map(doc => (
                    <Link 
                      key={doc.id} 
                      href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`}
                      onClick={() => ctx.setSearchQuery("")}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-hover"
                    >
                      <FileText size={16} className="text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-foreground">{doc.title}</p>
                        <p className="text-xs tracking-[0.06em] text-muted uppercase">{doc.subject} • Module {doc.module_id || "N/A"} • {doc.category}</p>
                      </div>
                    </Link>
                  ))}
                  {ctx.globalSearchResults.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs font-semibold text-muted">Try a subject name, or help classmates by uploading the resource you were looking for.</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <Link href="/recent-uploads" onClick={() => ctx.setSearchQuery("")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface-hover">
                          Start Studying
                        </Link>
                        <button onClick={() => { ctx.setSearchQuery(""); requestUploadPrompt(); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
                          Upload Notes
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button onClick={ctx.toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground hover:bg-surface-hover motion-hover motion-active">
          {ctx.mounted ? (ctx.isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : null}
        </button>
        
        {(ctx.isAdmin || ctx.isStudent) && (
          <div className="relative">
            <button onClick={() => ctx.setShowNotifications(!ctx.showNotifications)} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-surface-hover transition-colors">
              <Bell size={18} className="text-muted" />
              {ctx.unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white shadow-sm ring-2 ring-surface">{ctx.unreadCount > 9 ? "9+" : ctx.unreadCount}</span>}
            </button>
            {ctx.showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => ctx.setShowNotifications(false)} />
                <div className="absolute -right-2 sm:right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-2rem)] sm:w-80 rounded-2xl border border-border bg-surface shadow-2xl animate-in slide-in-from-top-2 motion-dropdown">
                  <div className="flex items-center justify-between border-b border-border p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">Notifications</p>
                    <div className="flex items-center gap-2">
                      {ctx.notifications.some((n) => n.is_read) && (
                        <button 
                          onClick={async () => {
                            if(window.confirm("Are you sure you want to clear all read notifications?")) {
                              const { data: sess } = await supabase.auth.getSession();
                              if (sess?.session?.user) {
                                const { error } = await supabase.from('notifications').delete().eq('user_id', sess.session.user.id).eq('is_read', true);
                                if (!error) ctx.setNotifications(prev => prev.filter(n => !n.is_read));
                              }
                            }
                          }}
                          className="text-xs tracking-[0.06em] font-bold text-destructive hover:opacity-80 transition-opacity"
                        >Clear Read</button>
                      )}
                      {ctx.unreadCount > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs tracking-[0.06em] font-bold text-primary">{ctx.unreadCount} New</span>}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {ctx.notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted">You're all caught up!</p>
                    ) : (
                      ctx.notifications.map((notif) => (
                        <div key={notif.id} onClick={() => ctx.handleMarkAsRead(notif.id, notif.is_read)} className={`flex cursor-pointer flex-col gap-1 rounded-xl p-3 transition-colors hover:bg-surface-hover ${!notif.is_read ? "bg-accent/50" : ""}`}>
                          <div className="flex items-start justify-between">
                            <p className={`text-xs ${!notif.is_read ? "font-bold text-foreground" : "font-semibold text-muted"}`}>{notif.title}</p>
                            {!notif.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : <CheckCheck size={12} className="mt-0.5 shrink-0 text-success" />}
                          </div>
                          <p className="text-xs leading-tight text-muted">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {(ctx.isAdmin || ctx.isStudent) ? (
          <div className="flex items-center gap-3">
            <button onClick={() => ctx.setShowUploadForm(true)} className="flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active">
              <Plus size={14} /> <span className="hidden sm:inline">{ctx.isAdmin ? "Upload" : "Contribute"}</span>
            </button>
            <div className="hidden sm:block">
              <ProfileDropdown userName={ctx.uploadedBy || (ctx.isAdmin ? "Admin" : "Student")} userEmail={ctx.currentUserEmail} onLogout={ctx.handleLogout} />
            </div>
          </div>
        ) : (
          <button onClick={() => ctx.openAuthPrompt("upload")} className="flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 motion-hover motion-active">
            <Plus size={14} /> <span className="hidden sm:inline">Contribute</span>
          </button>
        )}
      </div>
    </div>
  </header>
);

// 3. Sidebar Components
export const SidebarNavigation = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <div className="space-y-6 flex-1">
    <div>
      {!ctx.sidebarCollapsed && <p className="px-3 pb-2 text-xs tracking-[0.06em] font-bold uppercase text-muted">Navigation</p>}
      <Link 
        href="/" 
        title={ctx.sidebarCollapsed ? "Back to Homepage" : undefined} 
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold motion-hover motion-active transition-colors ${
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
          className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold motion-hover motion-active transition-colors ${
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
      {!ctx.sidebarCollapsed && <p className="px-3 pb-2 text-xs tracking-[0.06em] font-bold uppercase text-muted">Student Workspace</p>}
      {(ctx.isAdmin || ctx.isStudent) ? (
        <Link
          href="/continue-studying"
          title={ctx.sidebarCollapsed ? "Continue Studying" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold motion-hover motion-active transition-colors ${
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
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors motion-hover motion-active hover:bg-surface-hover hover:text-primary"
        >
          <Clock size={18} /> {!ctx.sidebarCollapsed && "Continue Studying"}
        </button>
      )}
      {(ctx.isAdmin || ctx.isStudent) ? (
        <Link
          href="/bookmarks"
          title={ctx.sidebarCollapsed ? "Bookmarks" : undefined}
          className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold motion-hover motion-active transition-colors ${
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
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition-colors motion-hover motion-active hover:bg-surface-hover hover:text-warning"
        >
          <Bookmark size={18} /> {!ctx.sidebarCollapsed && "Bookmarks"}
        </button>
      )}
      <Link 
        href="/recent-uploads" 
        title={ctx.sidebarCollapsed ? "Recent Uploads" : undefined} 
        className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold motion-hover motion-active transition-colors ${
          ctx.pathname === '/recent-uploads'
            ? 'bg-success/10 text-success'
            : 'text-muted hover:bg-surface-hover hover:text-success'
        }`}
      >
        <Upload size={18} /> {!ctx.sidebarCollapsed && "Recent Uploads"}
      </Link>
    </div>

    {!ctx.sidebarCollapsed && ctx.trendingDocs.length > 0 && (
      <div>
        <p className="px-3 pb-2 text-xs tracking-[0.06em] font-bold uppercase text-muted">Discovery</p>
        <div className="rounded-2xl border border-border bg-surface p-3 space-y-2.5">
          <div className="flex items-center gap-2 text-primary"><TrendingUp size={13} /><h3 className="text-xs tracking-[0.06em] font-extrabold uppercase">Trending Now</h3></div>
          {ctx.trendingDocs.slice(0, 5).map((doc: any, idx: number) => (
            <Link key={`tr-${doc.id}`} href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} className="block text-xs group">
              <p className="truncate font-bold text-foreground group-hover:text-primary transition-colors">{idx + 1}. {doc.title}</p>
            </Link>
          ))}
        </div>
      </div>
    )}
  </div>
);

export const SidebarFooter = ({ ctx }: { ctx: ClientLayoutContext }) => {
  if (ctx.sidebarCollapsed) return null;
  return (
    <div className="mt-auto flex flex-col pt-4">
      {(ctx.isAdmin || ctx.isStudent) && (
        <ProfileSidebarCard userName={ctx.uploadedBy || (ctx.isAdmin ? "Admin" : "Student")} role={ctx.isAdmin ? "Administrator" : "1st year · CSE"} />
      )}
      <div className="space-y-0.5 border-t border-border mt-3 px-3 pt-4 text-xs tracking-[0.06em] font-medium text-muted">
        <p>Academic Portal • Version 1.6</p>
        <p>© {new Date().getFullYear()} All Rights Reserved.</p>
      </div>
    </div>
  );
};

export const Sidebar = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <aside aria-label="Main Desktop Navigation" className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-border bg-background py-6 motion-sidebar lg:flex ${ctx.sidebarCollapsed ? 'w-16 px-2' : 'w-[220px] px-4'}`}>
    <SidebarNavigation ctx={ctx} />
    <SidebarFooter ctx={ctx} />
  </aside>
);

// 4. Modals and Overlays
export const AuthModal = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const promptCopy = ctx.authPromptContext ? AUTH_PROMPT_COPY[ctx.authPromptContext] : null;
  const title = promptCopy?.title || (ctx.authMode === "signin" ? "Sign In" : ctx.authMode === "signup" ? "Sign Up" : "Reset Password");
  const description = ctx.authMode === "forgot"
    ? "Enter your email and we will send you a reset link."
    : promptCopy?.description || "Authenticate to access your student workspace.";

  return (
  <Dialog.Root open={ctx.showAuthModal} onOpenChange={ctx.handleAuthModalOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-xl font-extrabold text-foreground">{title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm font-medium leading-6 text-muted">{description}</Dialog.Description>
          </div>
          <Dialog.Close asChild><button aria-label="Close" className="shrink-0 text-muted hover:opacity-80"><X size={20} /></button></Dialog.Close>
        </div>
        {ctx.authMode !== "forgot" && (
          <>
            <button type="button" onClick={ctx.handleGoogleLogin} disabled={ctx.googleLoading || ctx.authLoading} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface font-bold text-foreground motion-hover motion-active hover:bg-surface-hover hover:shadow-sm">
              {ctx.googleLoading ? <Loader2 className="animate-spin text-muted" size={20} /> : <><FcGoogle size={24} /> Continue with Google</>}
            </button>
            <div className="my-6 flex items-center"><div className="flex-grow border-t border-border"></div><span className="mx-4 text-xs tracking-[0.06em] font-extrabold uppercase text-muted">Or use email</span><div className="flex-grow border-t border-border"></div></div>
          </>
        )}
        <form onSubmit={ctx.handleAuthSubmit} className="space-y-4">
          <input required type="email" value={ctx.authEmail} onChange={(e) => ctx.setAuthEmail(e.target.value)} placeholder="Email Address" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary text-foreground motion-focus" />
          {ctx.authMode !== "forgot" && <input required type="password" value={ctx.authPassword} onChange={(e) => ctx.setAuthPassword(e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary text-foreground motion-focus" />}
          <button type="submit" disabled={ctx.authLoading || ctx.googleLoading} className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active">
            {ctx.authLoading ? <Loader2 className="mx-auto animate-spin" size={18} /> : ctx.authMode === "signin" ? "Login" : ctx.authMode === "signup" ? "Create Account" : "Send Reset Link"}
          </button>
          {ctx.authMode === "signin" && (
            <div className="flex justify-between w-full mt-2 text-xs font-bold text-primary">
              <button type="button" onClick={() => ctx.setAuthMode("forgot")} className="hover:underline">Forgot Password?</button>
              <button type="button" onClick={() => ctx.setAuthMode("signup")} className="hover:underline">New student? Sign Up</button>
            </div>
          )}
          {ctx.authMode === "signup" && <button type="button" onClick={() => ctx.setAuthMode("signin")} className="w-full mt-2 text-xs font-bold text-primary hover:underline">Already have an account? Sign In</button>}
          {ctx.authMode === "forgot" && <button type="button" onClick={() => ctx.setAuthMode("signin")} className="w-full mt-2 text-xs font-bold text-primary hover:underline">Back to Sign In</button>}
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
  );
};

export const UploadModal = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <Dialog.Root open={ctx.showUploadForm} onOpenChange={ctx.setShowUploadForm}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
        <div className="flex items-center justify-between mb-6">
          <Dialog.Title className="text-lg font-extrabold text-foreground">{ctx.isAdmin ? "Admin Database Upload" : "Student Contribution"}</Dialog.Title>
          <Dialog.Close asChild><button className="text-muted hover:opacity-80 transition-opacity"><X size={20} /></button></Dialog.Close>
        </div>
        <form onSubmit={ctx.handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Subject</label>
              <select value={ctx.uploadSubject} onChange={(e) => ctx.setUploadSubject(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none text-foreground motion-focus">{SUBJECTS_LIST.map(sub => <option key={sub} value={sub}>{sub}</option>)}</select>
            </div>
            <div>
              <label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Module</label>
              <select value={ctx.uploadModule} onChange={(e) => ctx.setUploadModule(Number(e.target.value))} disabled={ctx.uploadCategory === "syllabus" || isNonModuleSubject(ctx.uploadSubject)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none text-foreground motion-focus disabled:opacity-50 disabled:cursor-not-allowed">
                {[1, 2, 3, 4, 5].map(m => <option key={m} value={m}>Module {m}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Title</label><input required type="text" value={ctx.uploadTitle} onChange={(e) => ctx.setUploadTitle(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none text-foreground motion-focus" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Category</label><select value={ctx.uploadCategory} onChange={(e) => ctx.setUploadCategory(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none text-foreground motion-focus"><option value="notes">Notes</option><option value="pyq">PYQ</option><option value="syllabus">Syllabus</option></select></div>
            <div><label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Uploader</label><input type="text" value={ctx.uploadedBy} onChange={(e) => ctx.setUploadedBy(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none text-foreground motion-focus" /></div>
          </div>
          <div><input required type="file" accept="application/pdf" onChange={(e) => ctx.setFile(e.target.files?.[0] || null)} className="w-full py-2 text-xs text-foreground disabled:opacity-50" /></div>
          <UploadProgressBar state={ctx.uploadState} progress={ctx.uploadProgress} fileName={ctx.file?.name} errorMessage={ctx.uploadErrorMsg} />
          <button type="submit" disabled={ctx.uploadState === "uploading" || ctx.uploadState === "processing" || ctx.uploadState === "success"} className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 motion-hover motion-active">{(ctx.uploadState === "uploading" || ctx.uploadState === "processing") ? "Processing..." : "Publish Resource"}</button>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export const MobileNav = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const isSignedIn = ctx.isAdmin || ctx.isStudent;

  // Lock body scroll when Sign Out Modal is open
  useEffect(() => {
    if (isSignOutModalOpen) {
      window.document.body.style.overflow = "hidden";
    } else {
      window.document.body.style.overflow = "unset";
    }
    return () => {
      window.document.body.style.overflow = "unset";
    };
  }, [isSignOutModalOpen]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-center justify-around border-t border-border bg-surface/90 backdrop-blur-xl pb-safe lg:hidden px-2">
        <Link href="/" onClick={() => ctx.setShowMobileMenu(false)} className={`flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-2 transition-colors ${ctx.pathname === '/' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover'}`}>
          <Home size={22} /><span className="text-xs font-bold">Home</span>
        </Link>
        {isSignedIn ? (
          <Link href="/profile" onClick={() => ctx.setShowMobileMenu(false)} className={`flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-2 transition-colors ${ctx.pathname === '/profile' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover'}`}>
            <User size={22} /><span className="text-xs font-bold">Profile</span>
          </Link>
        ) : (
          <button type="button" onClick={() => ctx.openAuthPrompt("profile")} className="flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-2 text-muted transition-colors hover:bg-surface-hover">
            <User size={22} /><span className="text-xs font-bold">Profile</span>
          </button>
        )}
        {isSignedIn ? (
          <Link href="/bookmarks" onClick={() => ctx.setShowMobileMenu(false)} className={`flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-2 transition-colors ${ctx.pathname === '/bookmarks' ? 'bg-warning/10 text-warning' : 'text-muted hover:bg-surface-hover'}`}>
            <Bookmark size={22} /><span className="text-xs font-bold">Bookmarks</span>
          </Link>
        ) : (
          <button type="button" onClick={() => ctx.openAuthPrompt("bookmark")} className="flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-2 text-muted transition-colors hover:bg-surface-hover">
            <Bookmark size={22} /><span className="text-xs font-bold">Bookmarks</span>
          </button>
        )}
        <button onClick={() => ctx.setShowMobileMenu(true)} className={`flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl p-2 transition-colors ${ctx.showMobileMenu ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-hover'}`}>
          <Menu size={22} /><span className="text-xs font-bold">More</span>
        </button>
      </nav>
      
      {ctx.showMobileMenu && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 backdrop-blur-sm lg:hidden motion-modal" onClick={() => ctx.setShowMobileMenu(false)}>
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-6 pb-28 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-extrabold text-foreground">More Options</h2><button onClick={() => ctx.setShowMobileMenu(false)} className="rounded-full bg-surface-hover p-2 text-muted"><X size={20} /></button></div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Link href="/recent-uploads" onClick={() => ctx.setShowMobileMenu(false)} className="flex items-center gap-3 rounded-2xl bg-surface-hover p-3.5 text-xs font-bold text-foreground motion-hover motion-active"><Upload size={18} className="text-success" /> <span>Uploads</span></Link>
                {isSignedIn ? (
                  <Link href="/continue-studying" onClick={() => ctx.setShowMobileMenu(false)} className="flex items-center gap-3 rounded-2xl bg-surface-hover p-3.5 text-xs font-bold text-foreground motion-hover motion-active"><Clock size={18} className="text-primary" /> <span>Continue</span></Link>
                ) : (
                  <button type="button" onClick={() => { ctx.setShowMobileMenu(false); ctx.openAuthPrompt("continueStudying"); }} className="flex items-center gap-3 rounded-2xl bg-surface-hover p-3.5 text-left text-xs font-bold text-foreground motion-hover motion-active"><Clock size={18} className="text-primary" /> <span>Continue</span></button>
                )}
                {!isSignedIn && (
                  <button type="button" onClick={() => { ctx.setShowMobileMenu(false); ctx.openAuthPrompt("upload"); }} className="flex items-center gap-3 rounded-2xl bg-surface-hover p-3.5 text-left text-xs font-bold text-foreground motion-hover motion-active"><Plus size={18} className="text-primary" /> <span>Contribute</span></button>
                )}
              </div>
              {isSignedIn && (
                <div className="border-t border-border pt-4">
                  <button 
                    onClick={() => { 
                      ctx.setShowMobileMenu(false); 
                      setIsSignOutModalOpen(true); 
                    }} 
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 p-3 text-sm font-semibold text-destructive hover:bg-destructive/10 motion-hover motion-active"
                  >
                    <LogOut size={18} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal for Mobile */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-border p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-2">Sign Out</h2>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to sign out? You will need to log back in to access your study materials and contributions.
            </p>
            
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="flex-1 rounded-xl bg-surface-hover border border-border py-2.5 text-sm font-bold text-foreground transition-colors hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  ctx.handleLogout();
                  window.location.href = "/";
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground transition-colors hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const BannersAndToasts = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <>
    {ctx.isStudent && !ctx.emailConfirmed && (
      <div className="z-50 flex items-center justify-center gap-2 bg-warning/10 px-4 py-2 text-center text-xs font-semibold text-warning">
        <Mail size={14} /><span>Please verify your email address to unlock upload privileges.</span>
        <button onClick={ctx.sendVerificationEmail} className="ml-2 font-bold underline hover:opacity-80">Send Link</button>
      </div>
    )}
    {ctx.isOffline && (
      <div className="z-40 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-semibold text-white">
        <WifiOff size={14} /><span>You are currently offline. Viewing cached pages only.</span>
      </div>
    )}
    {ctx.activeToast && <AchievementToast title={ctx.activeToast.title} description={ctx.activeToast.description} onClose={() => ctx.setActiveToast(null)} />}
    <Toast.Root open={ctx.globalToast.open} onOpenChange={(open) => ctx.setGlobalToast(prev => ({...prev, open}))} className={`fixed z-[150] bottom-4 right-4 w-auto max-w-md rounded-xl p-4 shadow-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ctx.globalToast.type === 'error' ? 'bg-destructive/10 border-destructive/20' : ctx.globalToast.type === 'success' ? 'bg-success/10 border-success/20' : 'bg-surface border-border'}`}>
      <Toast.Title className={`text-sm font-bold ${ctx.globalToast.type === 'error' ? 'text-destructive' : ctx.globalToast.type === 'success' ? 'text-success' : 'text-foreground'}`}>{ctx.globalToast.title}</Toast.Title>
      <Toast.Description className={`mt-1 text-xs ${ctx.globalToast.type === 'error' ? 'text-destructive/80' : ctx.globalToast.type === 'success' ? 'text-success/80' : 'text-muted'}`}>{ctx.globalToast.message}</Toast.Description>
    </Toast.Root>
  </>
);
