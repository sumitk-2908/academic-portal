"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import Fuse from "fuse.js";
import { 
  Search, Clock, Bookmark, Upload, User, FileText, Command, X, ArrowRight, CornerDownLeft, FolderOpen
} from "lucide-react";
import { ClientLayoutContext, SUBJECTS_LIST, isNonModuleSubject } from "@/app/hooks/useClientLayout";
import { requestUploadPrompt } from "@/app/lib/student-prompts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import { subjectSlug, documentHref } from "@/components/layout/utils";

const RECENT_SEARCHES_KEY = "portal_recent_searches";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  section: string;
  icon: React.ReactNode;
  action: () => void;
};

export const CommandPalette = ({ ctx, open, onOpenChange, isMac }: { ctx: ClientLayoutContext; open: boolean; onOpenChange: (open: boolean) => void; isMac: boolean }) => {
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

  const allSubjectItems = useMemo<CommandItem[]>(() => SUBJECTS_LIST.flatMap((subject) => {
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
  }), [navigateTo]);

  const subjectItems = useMemo<CommandItem[]>(() => {
    if (!normalizedQuery) return [];
    const fuse = new Fuse(allSubjectItems, { keys: ["label", "description"], threshold: 0.4 });
    return fuse.search(normalizedQuery).map(result => result.item).slice(0, 8);
  }, [allSubjectItems, normalizedQuery]);

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

  const visibleQuickActions = useMemo<CommandItem[]>(() => {
    if (!normalizedQuery) return quickActions;
    const fuse = new Fuse(quickActions, { keys: ["label", "description"], threshold: 0.4 });
    return fuse.search(normalizedQuery).map(result => result.item);
  }, [quickActions, normalizedQuery]);

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
        <Dialog.Overlay className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby="command-palette-description"
          className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-4 data-[state=open]:slide-in-from-top-4 fixed top-20 left-[50%] z-[100] w-[calc(100vw-1.5rem)] max-w-2xl translate-x-[-50%] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl sm:top-[14vh]"
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
              <button type="button" aria-label="Close command palette" className="motion-hover motion-active rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div id="command-palette-results" role="listbox" className="max-h-[68vh] overflow-y-auto p-2">
            {ctx.isSearching && normalizedQuery && (
              <div className="flex items-center gap-2 p-3 text-xs font-bold text-muted">
                <InlineSpinner label="Searching" size={14} /> Searching documents
              </div>
            )}
            {!ctx.isSearching && normalizedQuery && documentItems.length === 0 && (
              <div className="p-3 text-xs font-semibold text-muted">No documents found. Try a subject, module, or quick action.</div>
            )}

            {Object.entries(groupedItems).map(([section, sectionItems]) => (
              <div key={section} className="py-1">
                <p className="px-3 py-2 text-xs font-bold tracking-[0.06em] text-muted uppercase">{section}</p>
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
                        className={`motion-hover flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${isActive ? "bg-accent text-foreground" : "text-foreground hover:bg-surface-hover"}`}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">{item.icon}</span>
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
