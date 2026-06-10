"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDocumentsByModule,
  uploadDocument,
  deleteDocument,
  searchDocuments,
  supabase,
} from "./lib/api";
import {
  FileText, Download, GraduationCap, Plus, Upload, X, Lock, LogOut,
  Trash2, LayoutDashboard, NotebookPen, FileQuestion, ListChecks,
  Search, BookOpen, Moon, Sun, Loader2, Bookmark, Clock,
  Layers, FolderOpen, ChevronRight, TrendingUp, Eye,
  PanelLeft, PanelLeftClose
} from "lucide-react";

interface Document {
  id: number;
  title: string;
  category: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  module_id?: number;
  subject?: string;
}

type NavKey = "dashboard" | "notes" | "pyq" | "syllabus" | "bookmarks" | "recent";

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "pyq", label: "PYQs", icon: FileQuestion },
  { key: "syllabus", label: "Syllabus", icon: ListChecks },
];

const CATEGORY_STYLES: Record<string, string> = {
  notes: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/25",
  pyq: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25",
  syllabus: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25",
};

const CATEGORY_ICON_STYLES: Record<string, string> = {
  notes: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  pyq: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  syllabus: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const SUBJECTS = [
  "MATHS 1", "MATHS 2", "PHYSICS", "BEE", "PPS", "BIOLOGY", "WORKSHOP",
  "PHYSICS LAB", "COMMUNICATION SKILLS", "CHEMISTRY", "BME", "BE",
  "ENVIRONMENTAL SCIENCE", "BE LAB", "BEE LAB", "CHEMISTRY LAB", "NSS",
  "ENGINEERING GRAPHICS"
];

function categoryLabel(category: string) {
  if (category === "pyq") return "PYQ";
  return category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ");
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- Auth states ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  // --- UI & Navigation states ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // --- Hierarchy states ---
  const [activeSubject, setActiveSubject] = useState(SUBJECTS[0]);
  const [activeModule, setActiveModule] = useState(1);

  // --- Modal & Feature States ---
  const [showForm, setShowForm] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  // --- Upload Form states ---
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("notes");
  const [uploadedBy, setUploadedBy] = useState("");
  const [uploadSubject, setUploadSubject] = useState(activeSubject);
  const [uploadModule, setUploadModule] = useState(activeModule);

  useEffect(() => {
    setMounted(true);
    setIsDarkMode(document.documentElement.classList.contains("dark"));
    const storedBookmarks = localStorage.getItem("portal_bookmarks");
    if (storedBookmarks) {
      setBookmarks(JSON.parse(storedBookmarks));
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const toggleBookmark = (id: number) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      localStorage.setItem("portal_bookmarks", JSON.stringify(next));
      return next;
    });
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      let data = [];
      if (activeNav === "recent" || activeNav === "bookmarks") {
        data = await searchDocuments(""); 
      } else {
        data = await getDocumentsByModule(activeModule);
      }
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setIsSearchingGlobal(true);
        setLoading(true);
        try {
          const results = await searchDocuments(searchQuery);
          setDocuments(results);
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setIsSearchingGlobal(false);
        fetchDocs(); 
      }
    }, 400); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeModule, activeSubject, activeNav]); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAdmin(true);
    });
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
    } else {
      setIsAdmin(true);
      setShowLogin(false);
      setEmail("");
      setPassword("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setShowForm(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file!");

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    formData.append("module_id", String(uploadModule)); 
    formData.append("uploaded_by", uploadedBy || "Admin");
    formData.append("subject", uploadSubject); 

    try {
      await uploadDocument(formData);
      setFile(null);
      setTitle("");
      setUploadedBy("");
      setShowForm(false);
      await fetchDocs();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check terminal for details.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this PDF forever?")) return;
    try {
      await deleteDocument(id);
      await fetchDocs();
    } catch (error) {
      console.error("Failed to delete document:", error);
      alert("Failed to delete. Check your terminal.");
    }
  };

  const filteredDocuments = useMemo(() => {
    if (isSearchingGlobal) return documents;
    
    if (activeNav === "bookmarks") {
      return documents.filter(doc => bookmarks.includes(doc.id));
    }
    
    if (activeNav === "recent") {
      return [...documents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
    }

    return documents.filter((doc) => {
      const matchesSubject = doc.subject === activeSubject;
      const matchesCategory = activeNav === "dashboard" || doc.category === activeNav;
      return matchesSubject && matchesCategory;
    });
  }, [documents, isSearchingGlobal, activeSubject, activeNav, bookmarks]);

  const subjectDocs = useMemo(
    () => documents.filter((d) => d.subject === activeSubject),
    [documents, activeSubject]
  );
  
  const subjectModules = useMemo(
    () => new Set(subjectDocs.map((d) => d.module_id)).size,
    [subjectDocs]
  );

  const activeLabel = 
    activeNav === "bookmarks" ? "Your Bookmarks" :
    activeNav === "recent" ? "Recently Uploaded" :
    NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300 overflow-x-hidden w-full max-w-full">

      {/* ============================ HEADER ============================ */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 md:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <button 
              onClick={() => setSidebarCollapsed((v) => !v)} 
              className="hidden rounded-xl p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:inline-flex"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <GraduationCap size={20} />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-extrabold tracking-tight text-foreground">Academic Portal</p>
              <p className="text-[11px] font-medium text-muted">First-Year B.Tech Hub</p>
            </div>
          </div>

          <div className="flex flex-1 justify-center min-w-0 px-2">
            <div className="group relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" size={18} />
              <input
                type="text"
                placeholder="Search notes, PYQs, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search resources"
                className="h-10 w-full rounded-full border border-border bg-background pl-11 pr-10 text-sm font-medium text-foreground shadow-sm outline-none transition-all placeholder:text-muted/70 focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted shadow-sm transition-all hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Toggle theme"
            >
              {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : <div className="h-4 w-4" />}
            </button>

            {!isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setShowLogin((v) => !v)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
                  aria-expanded={showLogin}
                >
                  <Lock size={16} /> <span className="hidden sm:inline">Admin</span>
                </button>

                {showLogin && (
                  <>
                    <button className="fixed inset-0 z-10 cursor-default outline-none" onClick={() => setShowLogin(false)} tabIndex={-1} aria-label="Close login" />
                    <form onSubmit={handleAdminLogin} className="animate-fade-up absolute right-0 top-12 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-5 shadow-2xl">
                      <p className="mb-4 text-sm font-bold tracking-tight text-foreground">Sign in to manage resources</p>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="login-email" className="sr-only">Email</label>
                          <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        <div>
                          <label htmlFor="login-password" className="sr-only">Password</label>
                          <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" required />
                        </div>
                        {authError && <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">{authError}</p>}
                        <button type="submit" className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background">
                          Login
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/20 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse" /> Admin
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-muted transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                >
                  <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        {/* ============================ SIDEBAR ============================ */}
        <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-border bg-surface/40 py-6 transition-all duration-300 lg:flex ${sidebarCollapsed ? 'w-[72px] px-2 items-center' : 'w-64 px-3'}`}>
          {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Browse</p>}
          <nav className="space-y-1 w-full">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.key;
              const count = subjectDocs.filter((d) => item.key === "dashboard" || d.category === item.key).length;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted hover:bg-hover hover:text-foreground"} ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!sidebarCollapsed && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted"}`}>{count}</span>}
                </button>
              );
            })}
          </nav>

          {!sidebarCollapsed && <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-wider text-muted">Library</p>}
          <nav className="space-y-1 w-full mt-2">
            {[
              { key: "bookmarks", label: "Bookmarks", icon: Bookmark },
              { key: "recent", label: "Recent Uploads", icon: Clock },
            ].map((item) => {
              const active = activeNav === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key as NavKey)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted hover:bg-hover hover:text-foreground"} ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ============================ MAIN ============================ */}
        <main className="flex-1 px-4 pb-16 pt-6 md:px-6 lg:px-8 w-full min-w-0 max-w-full">
          <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-6">

            {/* HERO & DYNAMIC HEADERS */}
            {!isSearchingGlobal && activeNav !== "bookmarks" && activeNav !== "recent" && (
              <section className="animate-fade-up relative overflow-hidden w-full rounded-2xl border border-border bg-surface p-5 shadow-sm md:p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted">
                    <GraduationCap size={14} className="text-primary" /> Academic Portal
                  </div>
                  
                  {/* Fixed Header: Responsive scaling + text-wrap + break-words */}
                  <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl break-words whitespace-normal text-wrap">
                    Everything a first-year <span className="text-primary">B.Tech student</span> needs
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base break-words text-wrap">
                    Resources, PYQs, notes, assignments and syllabus beautifully organized in one place.
                  </p>

                  {/* Stat Cards - responsive grid */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full sm:max-w-md">
                    {[
                      { label: "Subjects", value: SUBJECTS.length, icon: BookOpen },
                      { label: "Resources", value: subjectDocs.length, icon: FileText },
                      { label: "Modules", value: subjectModules || 0, icon: Layers },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl border border-border bg-background p-2.5 min-w-0">
                        <Icon size={16} className="text-primary" />
                        <p className="mt-1.5 text-lg font-extrabold tracking-tight text-foreground truncate">{value}</p>
                        <p className="text-[10px] font-semibold text-muted uppercase tracking-wider truncate">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {isSearchingGlobal && (
              <section className="animate-fade-up w-full rounded-2xl border border-primary/20 bg-primary-soft p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Search size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-foreground md:text-xl truncate">Search results</h1>
                    <p className="text-xs font-medium text-muted truncate">Matching &ldquo;{searchQuery}&rdquo; across all subjects</p>
                  </div>
                </div>
              </section>
            )}

            {activeNav === "bookmarks" && !isSearchingGlobal && (
               <section className="animate-fade-up w-full rounded-2xl border border-border bg-surface p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bookmark size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-foreground md:text-xl truncate">Your Saved Bookmarks</h1>
                    <p className="text-xs font-medium text-muted truncate">Quick access to your most important resources.</p>
                  </div>
                </div>
              </section>
            )}

            {activeNav === "recent" && !isSearchingGlobal && (
               <section className="animate-fade-up w-full rounded-2xl border border-border bg-surface p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-foreground md:text-xl truncate">Recently Uploaded</h1>
                    <p className="text-xs font-medium text-muted truncate">The latest resources added to the database.</p>
                  </div>
                </div>
              </section>
            )}

            {/* SUBJECT + MODULE CONTROLS */}
            {!isSearchingGlobal && activeNav !== "bookmarks" && activeNav !== "recent" && (
              <section className="animate-fade-up w-full space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between w-full">
                  <div className="w-full space-y-1.5 sm:max-w-xs min-w-0">
                    <label htmlFor="hero-subject" className="text-[10px] font-bold uppercase tracking-wider text-muted">Subject Domain</label>
                    <div className="group relative w-full">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted transition-colors group-focus-within:text-primary">
                        <BookOpen size={16} />
                      </div>
                      <select
                        id="hero-subject"
                        value={activeSubject}
                        onChange={(e) => {
                          setActiveSubject(e.target.value);
                          setUploadSubject(e.target.value);
                        }}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-border bg-background pl-9 pr-10 text-xs font-bold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 truncate"
                      >
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-muted" />
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/30 transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
                    >
                      <Plus size={16} /> Upload Resource
                    </button>
                  )}
                </div>

                <div className="w-full">
                  {/* Fixed Module Grid: Responsive columns mathematically guaranteeing no overflow */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-1 w-full">
                    {[1, 2, 3, 4, 5].map((mod) => {
                      const active = activeModule === mod;
                      return (
                        <button
                          key={mod}
                          onClick={() => {
                            setActiveModule(mod);
                            setUploadModule(mod);
                          }}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0 ${
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                              : "border-border bg-background text-muted hover:border-primary/40 hover:text-foreground"
                          }`}
                          aria-pressed={active}
                        >
                          <Layers size={14} className={`shrink-0 ${active ? "text-primary-foreground" : "text-muted"}`} />
                          <span className="truncate">Module {mod}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* SEGMENTED CONTROL FOR MOBILE (overflow-x-auto restricted within its parent) */}
            <div className="w-full lg:hidden min-w-0">
              <nav className="flex gap-2 overflow-x-auto hide-scrollbar pb-2" aria-label="Resource categories">
                {[...NAV_ITEMS, {key: "bookmarks", label: "Bookmarks", icon: Bookmark}, {key: "recent", label: "Recent", icon: Clock}].map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveNav(item.key as NavKey)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "border border-border bg-surface text-muted"}`}
                    >
                      <Icon size={14} /> {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* GRID HEADER */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3 w-full">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-foreground md:text-lg truncate">
                  {isSearchingGlobal ? <TrendingUp size={18} className="shrink-0 text-primary" /> : <FolderOpen size={18} className="shrink-0 text-primary" />}
                  <span className="truncate">
                    {isSearchingGlobal
                      ? "Global Search"
                      : activeNav === "dashboard"
                      ? `${activeSubject} · Module ${activeModule}`
                      : activeLabel}
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-muted">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? "resource" : "resources"} available
                </p>
              </div>
            </div>

            {/* CONTENT GRID */}
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 w-full">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface w-full" />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center w-full">
                <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary ring-1 ring-primary/10">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-base font-bold tracking-tight text-foreground">No resources available yet</h3>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
                  {isSearchingGlobal
                    ? "Try a different keyword, or browse subjects directly."
                    : activeNav === "bookmarks"
                    ? "You haven't bookmarked any documents yet."
                    : "Materials for this selection will appear here once uploaded."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 w-full">
                {filteredDocuments.map((doc, idx) => {
                  const isBookmarked = bookmarks.includes(doc.id);
                  return (
                  <article
                    key={doc.id}
                    className="animate-fade-up group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 min-w-0"
                    style={{ animationDelay: `${Math.min(idx * 40, 240)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${CATEGORY_ICON_STYLES[doc.category] ?? "bg-primary/10 text-primary"}`}>
                        <FileText size={18} />
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 shrink-0 ${CATEGORY_STYLES[doc.category] ?? "bg-background text-muted ring-border"}`}>
                        {categoryLabel(doc.category)}
                      </span>
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-foreground break-words" title={doc.title}>
                      {doc.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      {(isSearchingGlobal || activeNav === "recent" || activeNav === "bookmarks") && doc.subject && (
                        <span className="inline-flex items-center gap-1 font-semibold text-primary truncate">
                          <BookOpen size={10} className="shrink-0" /> <span className="truncate">{doc.subject}</span>
                        </span>
                      )}
                      {doc.module_id && (
                        <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                          <Layers size={10} className="shrink-0" /> Module {doc.module_id}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} className="shrink-0" /> {formatDate(doc.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 flex-1 text-[11px] text-muted truncate">
                      By <span className="font-semibold text-foreground">{doc.uploaded_by || "Admin"}</span>
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0"
                      >
                        <Download size={14} className="shrink-0" /> <span className="truncate">Download</span>
                      </a>
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-background p-2 text-muted transition-all hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Preview document"
                        title="Preview PDF"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleBookmark(doc.id)}
                        className={`inline-flex shrink-0 items-center justify-center rounded-xl border p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isBookmarked ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background text-muted hover:border-primary hover:bg-primary/5 hover:text-primary'}`}
                        aria-label="Bookmark document"
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark PDF"}
                      >
                        <Bookmark size={16} className={isBookmarked ? "fill-primary" : ""} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-background p-2 text-muted transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                          aria-label="Delete document"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </article>
                )})}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ============================ UPLOAD MODAL ============================ */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div className="animate-fade-up relative z-10 w-full max-w-xl overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Upload size={14} />
                </div>
                <div>
                  <h2 id="modal-title" className="text-sm font-extrabold tracking-tight text-foreground">Upload Resource</h2>
                  <p className="text-[11px] font-medium text-muted">Add files to the central library</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl p-2 text-muted transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-background p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="target-subject" className="text-[10px] font-bold uppercase tracking-wider text-muted">Subject</label>
                  <select id="target-subject" value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    {SUBJECTS.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="target-module" className="text-[10px] font-bold uppercase tracking-wider text-muted">Module</label>
                  <select id="target-module" value={uploadModule} onChange={(e) => setUploadModule(Number(e.target.value))} className="h-10 w-full cursor-pointer rounded-xl border border-border bg-surface px-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    {[1, 2, 3, 4, 5].map((mod) => <option key={mod} value={mod}>Module {mod}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="doc-title" className="text-xs font-semibold text-foreground">Document Title</label>
                <input id="doc-title" required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Newton's Laws Summary" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none transition-all placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="doc-category" className="text-xs font-semibold text-foreground">Category</label>
                  <select id="doc-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <option value="notes">Notes</option>
                    <option value="pyq">PYQ (Previous Year Question)</option>
                    <option value="syllabus">Syllabus</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="doc-uploader" className="text-xs font-semibold text-foreground">Uploader Name</label>
                  <input id="doc-uploader" type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} placeholder="Admin" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground outline-none transition-all placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="doc-file" className="text-xs font-semibold text-foreground">PDF File</label>
                <div className="rounded-xl border border-dashed border-border bg-background p-1.5 transition-colors focus-within:border-primary hover:border-primary/50">
                  <input id="doc-file" required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full cursor-pointer text-xs font-medium text-muted outline-none file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:font-semibold file:text-foreground hover:file:bg-hover" />
                </div>
              </div>

              <div className="mt-5 flex gap-3 border-t border-border pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="h-10 flex-1 rounded-xl border border-border bg-surface text-xs font-semibold text-muted transition-all hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancel</button>
                <button disabled={uploading} type="submit" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background">
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================ PREVIEW MODAL ============================ */}
      {previewDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} aria-hidden="true" />
          <div className="animate-fade-up relative z-10 flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="preview-title" className="truncate text-sm font-extrabold tracking-tight text-foreground" title={previewDoc.title}>
                    {previewDoc.title}
                  </h2>
                  <p className="truncate text-[11px] font-medium text-muted">
                    {previewDoc.subject} • Module {previewDoc.module_id}
                  </p>
                </div>
              </div>
              
              <div className="flex shrink-0 items-center gap-2 pl-4">
                <a
                  href={previewDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
                >
                  <Download size={14} className="shrink-0" /> <span className="hidden md:inline">Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-xl border border-border bg-background p-2 text-muted transition-all hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-muted/20 p-2 sm:p-4">
              <iframe
                src={`${previewDoc.file_url}#view=FitH`}
                className="h-full w-full rounded-xl border border-border bg-background shadow-sm"
                title={`Preview of ${previewDoc.title}`}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}