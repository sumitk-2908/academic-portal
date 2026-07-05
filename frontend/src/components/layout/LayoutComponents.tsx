"use client";

import { useCallback, useMemo, useRef, useState,useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Toast from "@radix-ui/react-toast";
import { 
  GraduationCap, Search, Moon, Sun, LogOut, PanelLeft, PanelLeftClose, TrendingUp, X, 
  Bookmark, Clock, Upload, Inbox, Plus, FileText, Home, Menu, Mail,
  User, Bell, CheckCheck, WifiOff, ArrowRight, Command, CornerDownLeft, FolderOpen
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { ClientLayoutContext, SUBJECTS_LIST, isNonModuleSubject } from "@/app/hooks/useClientLayout";
import { AUTH_PROMPT_COPY } from "@/app/lib/auth-prompts";
import { requestUploadPrompt } from "@/app/lib/student-prompts";
import ProfileDropdown from "@/components/profile/ProfileDropdown";
import ProfileSidebarCard from "@/components/profile/ProfileSidebarCard";
import UploadProgressBar from "@/components/ui/UploadProgressBar";
import AchievementToast from "@/components/ui/AchievementToast";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { InlineSpinner, SidebarSkeleton } from "@/components/layout/SharedLayouts";
import { supabase } from "@/app/lib/api";

const RECENT_SEARCHES_KEY = "portal_recent_searches";

const subjectSlug = (subject: string) => subject.toLowerCase().replace(/ /g, "-");
type SearchDocument = {
  id: string | number;
  title: string;
  subject: string;
  module_id?: number | null;
  category?: string | null;
};
const documentHref = (doc: SearchDocument) => `/subject/${subjectSlug(doc.subject)}/module-${doc.module_id || 1}/${doc.id}`;

// 1. App Shell & Content Area
export const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-[100dvh] flex-col transition-colors duration-300 ease-premium bg-background text-foreground">{children}</div>
);

export const ContentArea = ({ children }: { children: React.ReactNode }) => (
  <main className="flex-1 w-full min-w-0 p-4 md:p-6 lg:p-8 overflow-x-clip pb-24 lg:pb-8">{children}</main>
);

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
};

const SearchTrigger = ({ onOpen, isMac }: { onOpen: () => void; isMac: boolean }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-haspopup="dialog"
    className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-hover px-3 text-left text-muted shadow-sm motion-hover motion-active hover:bg-surface hover:text-foreground md:max-w-md lg:max-w-xl"
  >
    <span className="flex min-w-0 items-center gap-2">
      <Search size={17} aria-hidden="true" />
      <span className="truncate text-sm font-semibold">Search...</span>
    </span>
    <kbd className="hidden shrink-0 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs font-bold text-muted shadow-sm md:inline-flex">
      {isMac ? "⌘K" : "Ctrl K"}
    </kbd>
  </button>
);

const CommandPalette = ({ ctx, open, onOpenChange, isMac }: { ctx: ClientLayoutContext; open: boolean; onOpenChange: (open: boolean) => void; isMac: boolean }) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const isSignedIn = ctx.isAdmin || ctx.isStudent;
  const normalizedQuery = ctx.searchQuery.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const saveRecentSearch = useCallback((query: string) => {
    const value = query.trim();
    if (!value) return;
    const next = [value, ...recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 5);
    setRecentSearches(next);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  }, [recentSearches]);

  const closePalette = useCallback(() => {
    onOpenChange(false);
    setActiveIndex(0);
  }, [onOpenChange]);

  const navigateTo = useCallback((href: string) => {
    saveRecentSearch(ctx.searchQuery);
    closePalette();
    ctx.setSearchQuery("");
    router.push(href);
  }, [closePalette, ctx, router, saveRecentSearch]);

  const quickActions = useMemo<CommandItem[]>(() => [
    {
      id: "quick-continue",
      label: "Continue Studying",
      description: isSignedIn ? "Resume your study workspace" : "Sign in to resume your study workspace",
      section: "Quick Actions",
      icon: <Clock size={16} className="text-primary" aria-hidden="true" />,
      action: () => isSignedIn ? navigateTo("/continue-studying") : (closePalette(), ctx.openAuthPrompt("continueStudying")),
    },
    {
      id: "quick-bookmarks",
      label: "Bookmarks",
      description: isSignedIn ? "Open saved resources" : "Sign in to view saved resources",
      section: "Quick Actions",
      icon: <Bookmark size={16} className="text-warning" aria-hidden="true" />,
      action: () => isSignedIn ? navigateTo("/bookmarks") : (closePalette(), ctx.openAuthPrompt("bookmark")),
    },
    {
      id: "quick-upload",
      label: "Upload",
      description: "Contribute notes, PYQs, or syllabus PDFs",
      section: "Quick Actions",
      icon: <Upload size={16} className="text-success" aria-hidden="true" />,
      action: () => { closePalette(); requestUploadPrompt(); },
    },
    {
      id: "quick-profile",
      label: "Profile",
      description: isSignedIn ? "Open your profile" : "Sign in to manage your profile",
      section: "Quick Actions",
      icon: <User size={16} className="text-primary" aria-hidden="true" />,
      action: () => isSignedIn ? navigateTo("/profile") : (closePalette(), ctx.openAuthPrompt("profile")),
    },
  ], [closePalette, ctx, isSignedIn, navigateTo]);

  const subjectItems = useMemo<CommandItem[]>(() => SUBJECTS_LIST.flatMap((subject) => {
    const slug = subjectSlug(subject);
    const base: CommandItem = {
      id: `subject-${slug}`,
      label: subject,
      description: "Open subject overview",
      section: "Subjects & Modules",
      icon: <FolderOpen size={16} className="text-primary" aria-hidden="true" />,
      action: () => navigateTo(`/subject/${slug}`),
    };
    const modules: CommandItem[] = isNonModuleSubject(subject) ? [] : [1, 2, 3, 4, 5].map((module) => ({
      id: `subject-${slug}-module-${module}`,
      label: `${subject} - Module ${module}`,
      description: "Open module resources",
      section: "Subjects & Modules",
      icon: <FileText size={16} className="text-muted" aria-hidden="true" />,
      action: () => navigateTo(`/subject/${slug}/module-${module}`),
    }));
    return [base, ...modules];
  }).filter((item) => {
    if (!normalizedQuery) return false;
    return `${item.label} ${item.description || ""}`.toLowerCase().includes(normalizedQuery);
  }).slice(0, 8), [navigateTo, normalizedQuery]);

  const documentItems = useMemo<CommandItem[]>(() => ctx.globalSearchResults.map((doc) => ({
    id: `doc-${doc.id}`,
    label: doc.title,
    description: `${doc.subject} • Module ${doc.module_id || "N/A"} • ${doc.category}`,
    section: "Documents",
    icon: <FileText size={16} className="text-primary" aria-hidden="true" />,
    action: () => navigateTo(documentHref(doc)),
  })), [ctx.globalSearchResults, navigateTo]);

  const recentItems = useMemo<CommandItem[]>(() => recentSearches
    .filter((item) => !normalizedQuery || item.toLowerCase().includes(normalizedQuery))
    .map((item) => ({
      id: `recent-${item}`,
      label: item,
      description: "Search again",
      section: "Recent Searches",
      icon: <Clock size={16} className="text-muted" aria-hidden="true" />,
      action: () => {
        ctx.setSearchQuery(item);
        saveRecentSearch(item);
        setActiveIndex(0);
        inputRef.current?.focus();
      },
    })), [ctx, normalizedQuery, recentSearches, saveRecentSearch]);

  const visibleQuickActions = quickActions.filter((item) => {
    if (!normalizedQuery) return true;
    return `${item.label} ${item.description || ""}`.toLowerCase().includes(normalizedQuery);
  });

  const items = [
    ...(normalizedQuery ? documentItems : []),
    ...subjectItems,
    ...(!normalizedQuery ? recentItems : recentItems.slice(0, 3)),
    ...visibleQuickActions,
  ];

  const groupedItems = items.reduce<Record<string, CommandItem[]>>((groups, item) => {
    groups[item.section] = [...(groups[item.section] || []), item];
    return groups;
  }, {});
  const selectedIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => items.length ? (index + 1) % items.length : 0);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => items.length ? (index - 1 + items.length) % items.length : 0);
    }
    if (event.key === "Enter" && items[selectedIndex]) {
      event.preventDefault();
      items[selectedIndex].action();
    }
  };

  let renderedIndex = 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="command-palette-description"
          className="fixed left-[50%] top-20 z-[100] w-[calc(100vw-1.5rem)] max-w-2xl translate-x-[-50%] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4 sm:top-[14vh]"
        >
          <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
          <p id="command-palette-description" className="sr-only">
            Search documents, navigate subjects and modules, reopen recent searches, or run quick actions.
          </p>
          <ErrorBoundary
            title="Search could not load"
            message="The search palette hit an unexpected problem. Close it and try again when you are ready."
            className="m-4"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Command size={18} className="hidden text-muted sm:block" aria-hidden="true" />
            <Search size={18} className="text-muted sm:hidden" aria-hidden="true" />
            <input
              ref={inputRef}
              value={ctx.searchQuery}
              onChange={(event) => {
                ctx.setSearchQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-results"
              aria-activedescendant={items[selectedIndex]?.id}
              placeholder="Search documents, subjects, modules, actions..."
              className="h-10 min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted"
            />
            <kbd className="hidden rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs font-bold text-muted sm:inline-flex">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close command palette" className="rounded-lg p-1.5 text-muted motion-hover motion-active hover:bg-surface-hover hover:text-foreground">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div id="command-palette-results" role="listbox" className="max-h-[68vh] overflow-y-auto p-2">
            {ctx.isSearching && normalizedQuery && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs font-bold text-muted">
                <InlineSpinner label="Searching" size={14} /> Searching documents
              </div>
            )}
            {!ctx.isSearching && normalizedQuery && documentItems.length === 0 && (
              <div className="px-3 py-3 text-xs font-semibold text-muted">No documents found. Try a subject, module, or quick action.</div>
            )}

            {Object.entries(groupedItems).map(([section, sectionItems]) => (
              <div key={section} className="py-1">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">{section}</p>
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const itemIndex = renderedIndex++;
                    const isActive = itemIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        id={item.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={item.action}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left motion-hover ${isActive ? "bg-accent text-foreground" : "text-foreground hover:bg-surface-hover"}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">{item.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{item.label}</span>
                          {item.description && <span className="block truncate text-xs font-semibold text-muted">{item.description}</span>}
                        </span>
                        <CornerDownLeft size={14} className={`shrink-0 ${isActive ? "text-primary" : "text-muted"}`} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!ctx.isSearching && items.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <Search size={24} className="text-muted" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-foreground">No commands found</p>
                <p className="mt-1 text-xs font-semibold text-muted">Try a document title, subject name, module, or action.</p>
              </div>
            )}
          </div>
          </ErrorBoundary>

          <div className="hidden items-center justify-between border-t border-border px-4 py-2 text-xs font-semibold text-muted sm:flex">
            <span className="flex items-center gap-2"><ArrowRight size={13} /> Use arrow keys to move</span>
            <span>Enter to open • Esc to close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

// 2. Top Bar (Header)
export const TopBar = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMac] = useState(() => typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac"));

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
  <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
    <div className="mx-auto flex min-h-16 w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
      
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

      <div className="order-3 flex w-full min-w-0 justify-center md:order-none md:flex-1">
        <SearchTrigger onOpen={() => setIsCommandOpen(true)} isMac={isMac} />
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
                <ErrorBoundary title="Notifications could not load" className="m-2" message="Notifications panel hit an unexpected problem.">
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
                      <p className="p-4 text-center text-xs text-muted">You&apos;re all caught up!</p>
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
                </ErrorBoundary>
              </>
            )}
          </div>
        )}

        {(ctx.isAdmin || ctx.isStudent) ? (
          <div className="flex items-center gap-3">
            <button onClick={() => {
              if (ctx.isAdmin || ctx.userProfile.full_name) {
                ctx.setShowUploadForm(true);
              } else {
                ctx.setShowProfileGate(true);
              }
            }} className="flex h-9 items-center gap-2 rounded-xl bg-primary px-3 sm:px-4 text-xs font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active">
              <Plus size={14} /> <span>{ctx.isAdmin ? "Upload" : "Contribute"}</span>
            </button>
            <div className="hidden sm:block">
              <ProfileDropdown userName={ctx.uploadedBy || (ctx.isAdmin ? "Admin" : "Student")} userEmail={ctx.currentUserEmail} onLogout={ctx.handleLogout} />
            </div>
          </div>
        ) : (
          <button onClick={() => ctx.openAuthPrompt("upload")} className="flex h-9 items-center gap-2 rounded-xl bg-primary px-3 sm:px-4 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 motion-hover motion-active">
            <Plus size={14} /> <span>Contribute</span>
          </button>
        )}
      </div>
      <CommandPalette ctx={ctx} open={isCommandOpen} onOpenChange={setIsCommandOpen} isMac={isMac} />
    </div>
  </header>
  );
};

// 3. Sidebar Components
export const SidebarNavigation = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <div className="space-y-6 flex-1">
    {ctx.sidebarLoading ? (
      <SidebarSkeleton collapsed={ctx.sidebarCollapsed} />
    ) : (
    <>
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

    <ErrorBoundary title="Trending section could not load" className="mt-2" message="Trending docs failed to load.">
      {!ctx.sidebarCollapsed && ctx.trendingDocs.length > 0 && (
        <div>
          <p className="px-3 pb-2 text-xs tracking-[0.06em] font-bold uppercase text-muted">Discovery</p>
          <div className="rounded-2xl border border-border bg-surface p-3 space-y-2.5">
            <div className="flex items-center gap-2 text-primary"><TrendingUp size={13} /><h3 className="text-xs tracking-[0.06em] font-extrabold uppercase">Trending Now</h3></div>
            {ctx.trendingDocs.slice(0, 5).map((doc: SearchDocument, idx: number) => (
              <Link key={`tr-${doc.id}`} href={documentHref(doc)} className="block text-xs group">
                <p className="truncate font-bold text-foreground group-hover:text-primary transition-colors">{idx + 1}. {doc.title}</p>
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
              {ctx.googleLoading ? <InlineSpinner label="Signing in with Google" className="text-muted" size={20} /> : <><FcGoogle size={24} /> Continue with Google</>}
            </button>
            <div className="my-6 flex items-center"><div className="flex-grow border-t border-border"></div><span className="mx-4 text-xs tracking-[0.06em] font-extrabold uppercase text-muted">Or use email</span><div className="flex-grow border-t border-border"></div></div>
          </>
        )}
        <form onSubmit={ctx.handleAuthSubmit} className="space-y-4">
          <input required type="email" value={ctx.authEmail} onChange={(e) => ctx.setAuthEmail(e.target.value)} placeholder="Email Address" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary text-foreground motion-focus" />
          {ctx.authMode !== "forgot" && <input required type="password" value={ctx.authPassword} onChange={(e) => ctx.setAuthPassword(e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary text-foreground motion-focus" />}
          <button type="submit" disabled={ctx.authLoading || ctx.googleLoading} className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active">
            {ctx.authLoading ? <InlineSpinner label="Authenticating" className="mx-auto" size={18} /> : ctx.authMode === "signin" ? "Login" : ctx.authMode === "signup" ? "Create Account" : "Send Reset Link"}
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
          <div><label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Category</label><select value={ctx.uploadCategory} onChange={(e) => ctx.setUploadCategory(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none text-foreground motion-focus"><option value="notes">Notes</option><option value="pyq">PYQ</option><option value="syllabus">Syllabus</option></select></div>
          <div>
            <label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">File Upload</label>
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-hover px-6 py-6 hover:bg-surface hover:border-primary/50 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-muted mb-2" />
                <p className="text-sm font-semibold text-foreground">{ctx.file ? ctx.file.name : "Choose a PDF file or drag & drop it here"}</p>
                <p className="text-xs text-muted mt-1">PDFs only (Max 10MB)</p>
              </div>
              <input required type="file" accept="application/pdf" onChange={(e) => ctx.setFile(e.target.files?.[0] || null)} className="absolute inset-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed" disabled={ctx.uploadState === "uploading" || ctx.uploadState === "processing"} />
            </div>
          </div>
          <UploadProgressBar state={ctx.uploadState} progress={ctx.uploadProgress} fileName={ctx.file?.name} errorMessage={ctx.uploadErrorMsg} />
          <button type="submit" disabled={ctx.uploadState === "uploading" || ctx.uploadState === "processing" || ctx.uploadState === "success"} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 motion-hover motion-active">{(ctx.uploadState === "uploading" || ctx.uploadState === "processing") ? <><InlineSpinner label="Processing upload" size={16} /> Processing</> : "Publish Resource"}</button>
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

export const OnboardingModal = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>([]);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const handleSkip = () => {
    sessionStorage.setItem(`skipped_onboarding_${ctx.currentUserEmail}`, "true");
    ctx.setShowOnboardingModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Display name is required.");
      return;
    }
    if ((branch && !academicYear) || (!branch && academicYear)) {
      setErrorMsg("If you provide a branch, you must also provide your year, and vice versa.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.user) {
        const { error } = await supabase.from('profiles').upsert({
          id: sess.session.user.id,
          full_name: name.trim(),
          preferred_branch: branch || null,
          academic_year: academicYear || null,
          favorite_subjects: favoriteSubjects,
        });
        if (error) throw error;
        ctx.updateUserProfile({ 
          full_name: name.trim(), 
          preferred_branch: branch || undefined, 
          academic_year: academicYear || undefined, 
          favorite_subjects: favoriteSubjects 
        });
        ctx.setShowOnboardingModal(false);
      }
    } catch (err: any) {
      setErrorMsg("Error saving profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={ctx.showOnboardingModal} onOpenChange={(open) => {
      if (!open && !sessionStorage.getItem(`skipped_onboarding_${ctx.currentUserEmail}`)) return;
      ctx.setShowOnboardingModal(open);
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="mb-6">
            <Dialog.Title className="text-xl font-extrabold text-foreground">Welcome!</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm font-medium leading-6 text-muted">
              Let&apos;s set up your profile so you can get the most out of the portal.
            </Dialog.Description>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && <p className="text-sm font-semibold text-destructive">{errorMsg}</p>}
            <div>
              <label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Display Name *</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary text-foreground motion-focus" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Branch</label>
                <input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="e.g. CSE" className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary text-foreground motion-focus" />
              </div>
              <div>
                <label className="block mb-1 text-xs tracking-[0.06em] font-bold uppercase text-muted">Year</label>
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary text-foreground motion-focus">
                  <option value="">Select Year</option>
                  <option value="1st year">1st year</option>
                  <option value="2nd year">2nd year</option>
                  <option value="3rd year">3rd year</option>
                  <option value="4th year">4th year</option>
                  <option value="5th year">5th year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.06em] text-muted mb-2">Favorite Subjects (Max 5)</label>
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 motion-focus-within focus-within:border-primary focus-within:bg-surface">
                  <Search size={16} className="text-muted ml-1" />
                  <input 
                    type="text" 
                    placeholder={favoriteSubjects.length < 5 ? "Search subjects..." : "Maximum subjects reached"}
                    value={subjectQuery}
                    onChange={(e) => setSubjectQuery(e.target.value)}
                    disabled={favoriteSubjects.length >= 5}
                    className="w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
                  />
                </div>
                {subjectQuery.trim() && favoriteSubjects.length < 5 && (
                  <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
                    {SUBJECTS_LIST.filter(s => s.toLowerCase().includes(subjectQuery.toLowerCase()) && !favoriteSubjects.includes(s)).map(subject => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => {
                          setFavoriteSubjects([...favoriteSubjects, subject]);
                          setSubjectQuery("");
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-primary/10 hover:text-primary motion-hover"
                      >
                        {subject}
                      </button>
                    ))}
                    {SUBJECTS_LIST.filter(s => s.toLowerCase().includes(subjectQuery.toLowerCase()) && !favoriteSubjects.includes(s)).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted">No subjects found.</div>
                    )}
                  </div>
                )}
              </div>
              {favoriteSubjects.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {favoriteSubjects.map(subject => (
                    <span key={subject} className="flex items-center gap-1 rounded-full bg-primary/10 pl-3 pr-1 py-1 text-xs font-bold text-primary">
                      {subject}
                      <button type="button" onClick={() => setFavoriteSubjects(favoriteSubjects.filter(s => s !== subject))} className="rounded-full p-1 hover:bg-primary/20 text-primary motion-hover">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active">
                {loading ? "Saving..." : "Save & Continue"}
              </button>
              <button type="button" onClick={handleSkip} disabled={loading} className="w-full mt-2 text-xs font-bold text-muted hover:text-foreground">
                Skip for now
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export const ProfileGateModal = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const router = useRouter();
  
  const handleLater = () => {
    ctx.setShowProfileGate(false);
    ctx.setShowUploadForm(true);
  };

  const handleSetup = () => {
    ctx.setShowProfileGate(false);
    router.push("/profile?edit=true");
  };

  return (
    <Dialog.Root open={ctx.showProfileGate} onOpenChange={ctx.setShowProfileGate}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] w-full max-w-sm translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="mb-6">
            <Dialog.Title className="text-lg font-extrabold text-foreground">Ready to set up your profile?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm font-medium leading-6 text-muted">
              Adding your real name gives you proper attribution for your contributions and builds trust in the community.
            </Dialog.Description>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleSetup} className="h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 motion-hover motion-active">
              Set Up Profile
            </button>
            <button onClick={handleLater} className="h-11 w-full rounded-xl bg-surface-hover font-bold text-foreground hover:opacity-80 motion-hover motion-active">
              Later
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
