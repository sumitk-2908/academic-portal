"use client";

import { useEffect, useState } from "react";
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
  PanelLeftClose, PanelLeft, Search, BookOpen, Moon, Sun, Loader2
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

type NavKey = "dashboard" | "notes" | "pyq" | "syllabus";

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "pyq", label: "PYQs", icon: FileQuestion },
  { key: "syllabus", label: "Syllabus", icon: ListChecks },
];

const CATEGORY_STYLES: Record<string, string> = {
  notes: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  pyq: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  syllabus: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
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

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false); // Prevents hydration mismatch on icons

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

  // --- Dynamic Upload Form states ---
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("notes");
  const [uploadedBy, setUploadedBy] = useState("");
  
  const [uploadSubject, setUploadSubject] = useState(activeSubject);
  const [uploadModule, setUploadModule] = useState(activeModule);

  // Hydration-safe dark mode initialization
  useEffect(() => {
    setMounted(true);
    setIsDarkMode(document.documentElement.classList.contains("dark"));
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

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await getDocumentsByModule(activeModule);
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
  }, [searchQuery, activeModule, activeSubject]); 

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

  const filteredDocuments = documents.filter((doc) => {
    if (isSearchingGlobal) return true;
    const matchesSubject = doc.subject === activeSubject;
    const matchesCategory = activeNav === "dashboard" || doc.category === activeNav;
    return matchesSubject && matchesCategory;
  }); 
  
  const activeLabel = NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarCollapsed((v) => !v)} 
            className="hidden rounded-md p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap size={20} />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-bold text-foreground tracking-tight">Academic Portal</p>
              <p className="text-xs font-medium text-muted">Global Knowledge Hub</p>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex flex-1 items-center justify-center px-4 md:px-8">
          <div className="relative w-full max-w-xl group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-foreground" size={18} />
            <input
              type="text"
              placeholder="Search subjects, modules, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Global search"
              className="w-full rounded-full border border-border bg-surface py-2 pl-10 pr-10 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:bg-border/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleTheme} 
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-all hover:bg-border/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
            aria-label="Toggle theme"
          >
            {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : <div className="h-4 w-4" />}
          </button>

          {!isAdmin ? (
            <div className="relative">
              <button 
                onClick={() => setShowLogin((v) => !v)} 
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
                aria-expanded={showLogin}
              >
                <Lock size={16} /> Admin
              </button>

              {showLogin && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default outline-none" onClick={() => setShowLogin(false)} tabIndex={-1} aria-label="Close modal" />
                  <form onSubmit={handleAdminLogin} className="absolute right-0 top-12 z-20 w-80 rounded-xl border border-border bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <p className="mb-4 text-sm font-bold text-foreground tracking-tight">Sign in to manage resources</p>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="login-email" className="sr-only">Email</label>
                        <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" required />
                      </div>
                      <div>
                        <label htmlFor="login-password" className="sr-only">Password</label>
                        <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" required />
                      </div>
                      {authError && <p className="text-xs font-semibold text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">{authError}</p>}
                      <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background shadow-sm">
                        Login
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success ring-1 ring-success/20 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Admin Mode
              </span>
              <button 
                onClick={handleLogout} 
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-muted transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        {/* Left Sidebar */}
        <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-background py-6 px-4 transition-all duration-300 md:block ${sidebarCollapsed ? "w-[72px]" : "w-60"}`}>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface hover:text-foreground"} ${sidebarCollapsed ? "justify-center" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 md:px-10 lg:py-12">
          <div className="mx-auto max-w-5xl space-y-8">
            
            {/* HERO SECTION */}
            {!isSearchingGlobal ? (
              <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="flex-1 space-y-6">
                    
                    {/* Subject Selector */}
                    <div className="space-y-2 max-w-sm">
                      <label htmlFor="hero-subject" className="text-xs font-bold uppercase tracking-wider text-muted">Academic Domain</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted group-focus-within:text-primary transition-colors">
                          <BookOpen size={18} />
                        </div>
                        <select 
                          id="hero-subject"
                          value={activeSubject}
                          onChange={(e) => {
                            setActiveSubject(e.target.value);
                            setUploadSubject(e.target.value); 
                          }}
                          className="w-full appearance-none rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-base font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                        >
                          {SUBJECTS.map(sub => (
                             <option key={sub} value={sub} className="bg-background text-foreground">{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Module Tabs */}
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((mod) => (
                        <button
                          key={mod}
                          onClick={() => {
                            setActiveModule(mod);
                            setUploadModule(mod); 
                          }}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            activeModule === mod 
                            ? "bg-foreground text-background shadow-sm" 
                            : "bg-background text-muted border border-border hover:border-foreground/20 hover:text-foreground"
                          }`}
                        >
                          Module {mod}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isAdmin && (
                    <button 
                      onClick={() => setShowForm(true)} 
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
                    >
                      <Plus size={18} /> Upload Resource
                    </button>
                  )}
                </div>
              </section>
            ) : (
              // Search Active State
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center animate-in fade-in duration-300">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Search Results</h1>
                <p className="text-muted mt-2 font-medium">Showing all documents matching "{searchQuery}" across the database.</p>
              </section>
            )}

            {/* Mobile Nav */}
            <nav className="flex gap-2 overflow-x-auto pb-2 md:hidden hide-scrollbar">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeNav === item.key ? "bg-foreground text-background shadow-sm" : "border border-border bg-surface text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Grid Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  {isSearchingGlobal ? <Search size={20} className="text-primary"/> : null}
                  {isSearchingGlobal ? "Global Search" : activeNav === "dashboard" ? `All Materials (Module ${activeModule})` : activeLabel}
                </h2>
                <p className="text-sm font-medium text-muted mt-1">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? "resource" : "resources"} available
                </p>
              </div>
            </div>

            {/* Content Grid */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-surface shadow-sm" />)}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-24 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background text-muted mb-4 ring-1 ring-border">
                  <Search size={24} />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">No resources found</h3>
                <p className="mt-1 text-sm text-muted max-w-sm">
                  {isSearchingGlobal ? "Try adjusting your search terms." : "This module does not contain any documents matching the current filter."}
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <article key={doc.id} className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                        <FileText size={20} />
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${CATEGORY_STYLES[doc.category] ?? "bg-background text-muted ring-border"}`}>
                        {categoryLabel(doc.category)}
                      </span>
                    </div>
                    
                    <h3 className="mt-4 text-base font-semibold leading-snug text-foreground line-clamp-2" title={doc.title}>{doc.title}</h3>
                    
                    {isSearchingGlobal && doc.module_id && (
                       <p className="mt-2 text-xs font-semibold text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-md">Module {doc.module_id}</p>
                    )}
                    
                    <p className="mt-2 text-xs text-muted flex-1">Uploaded by <span className="font-medium text-foreground">{doc.uploaded_by || "Admin"}</span></p>
                    
                    <div className="mt-5 flex items-center gap-2 pt-4 border-t border-border/50">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-background border border-border px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Download size={16} /> Download
                      </a>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(doc.id)} 
                          className="inline-flex items-center justify-center rounded-lg border border-border bg-background p-2 text-muted transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                          aria-label="Delete document"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DYNAMIC UPLOAD MODAL */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Upload size={16} />
                </div>
                <div>
                  <h2 id="modal-title" className="text-base font-bold tracking-tight text-foreground">Upload Resource</h2>
                  <p className="text-xs text-muted font-medium">Add files to the central database</p>
                </div>
              </div>
              <button 
                onClick={() => setShowForm(false)} 
                className="rounded-md p-1.5 text-muted hover:bg-border/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-5 px-6 py-6">
              
              <div className="rounded-xl border border-border bg-background p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="target-subject" className="text-xs font-bold uppercase tracking-wider text-muted">Subject</label>
                  <select id="target-subject" value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    {SUBJECTS.map(sub => <option key={sub} value={sub} className="bg-background">{sub}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="target-module" className="text-xs font-bold uppercase tracking-wider text-muted">Module</label>
                  <select id="target-module" value={uploadModule} onChange={(e) => setUploadModule(Number(e.target.value))} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer">
                     {[1, 2, 3, 4, 5].map(mod => <option key={mod} value={mod} className="bg-background">Module {mod}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="doc-title" className="text-sm font-semibold text-foreground">Document Title</label>
                <input id="doc-title" required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Newton's Laws Summary" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/70" />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="doc-category" className="text-sm font-semibold text-foreground">Category</label>
                  <select id="doc-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    <option value="notes" className="bg-background">Notes</option>
                    <option value="pyq" className="bg-background">PYQ (Previous Year Question)</option>
                    <option value="syllabus" className="bg-background">Syllabus</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="doc-uploader" className="text-sm font-semibold text-foreground">Uploader Name</label>
                  <input id="doc-uploader" type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} placeholder="Admin" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted/70" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="doc-file" className="text-sm font-semibold text-foreground">PDF File</label>
                <div className="rounded-lg border border-dashed border-border bg-background p-1.5 transition-colors focus-within:border-primary hover:border-primary/50">
                  <input id="doc-file" required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm font-medium text-muted file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-surface file:border file:border-border file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border/30 file:transition-colors cursor-pointer outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-sm font-semibold text-muted hover:bg-background hover:text-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancel</button>
                <button disabled={uploading} type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : "Submit to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}