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
  PanelLeftClose, PanelLeft, Search, BookOpen, Moon, Sun
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
  notes: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700",
  pyq: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700",
  syllabus: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700",
};

// The Massive New Subject List
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
  
  // Independent dropdowns inside the upload modal
  const [uploadSubject, setUploadSubject] = useState(activeSubject);
  const [uploadModule, setUploadModule] = useState(activeModule);

  // Robust Dark Mode Initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  // Persistent Theme Toggle
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

  // Real-Time Global Search Engine
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
    return activeNav === "dashboard" || doc.category === activeNav;
  });

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarCollapsed((v) => !v)} className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-foreground md:inline-flex">
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <GraduationCap size={20} />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-bold text-foreground tracking-wide">Academic Portal</p>
              <p className="text-xs text-muted font-medium">Global Knowledge Hub</p>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex flex-1 items-center justify-center px-4 md:px-8">
          <div className="relative w-full max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" size={18} />
            <input
              type="text"
              placeholder="Search across all subjects & modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border-2 border-border bg-background py-2.5 pl-11 pr-10 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm dark:bg-surface dark:focus:bg-background"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-border hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full border border-border bg-surface text-muted hover:bg-background hover:text-foreground transition-colors shadow-sm"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
          </button>

          {!isAdmin ? (
            <div className="relative">
              <button onClick={() => setShowLogin((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-blue-700 hover:shadow-md hover:shadow-primary/20">
                <Lock size={16} /> Admin
              </button>

              {showLogin && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowLogin(false)} tabIndex={-1} />
                  <form onSubmit={handleAdminLogin} className="absolute right-0 top-12 z-20 w-72 rounded-xl border border-border bg-surface p-5 shadow-2xl dark:shadow-black/50">
                    <p className="mb-4 text-sm font-bold text-foreground">Sign in to manage resources</p>
                    <div className="space-y-3">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" required />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" required />
                      {authError && <p className="text-xs font-bold text-destructive bg-destructive/10 dark:bg-destructive/20 dark:text-red-400 p-2 rounded">{authError}</p>}
                      <button type="submit" className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-blue-700 transition-colors">Login</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 dark:ring-emerald-500/30 sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-success dark:bg-emerald-400 animate-pulse" /> Admin Mode
              </span>
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-bold text-muted hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-surface/50 p-4 transition-all duration-300 md:block ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}>
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted hover:bg-border/50 hover:text-foreground"} ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon size={20} className="shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-8 md:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            
            {/* HERO SECTION - Enhanced Subject Selector */}
            {!isSearchingGlobal ? (
              <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-1 shadow-sm dark:shadow-none">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 dark:from-primary/10 via-transparent to-transparent opacity-50" />
                <div className="relative rounded-xl bg-background/50 backdrop-blur-xl p-6 md:p-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                  
                  <div className="flex-1 space-y-6">
                    {/* The Giant Eye-Catching Subject Dropdown */}
                    <div className="relative max-w-xl">
                      <label className="text-xs font-black uppercase tracking-widest text-primary/70 dark:text-primary/90 mb-2 block ml-1">Current Subject Domain</label>
                      <div className="flex items-center gap-4 bg-surface border-2 border-border hover:border-primary/50 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 rounded-2xl p-2 md:p-3 transition-all">
                        <div className="bg-primary text-primary-foreground p-3 md:p-4 rounded-xl shadow-lg shadow-primary/30">
                          <BookOpen size={28} className="md:w-8 md:h-8" />
                        </div>
                        <select 
                          value={activeSubject}
                          onChange={(e) => {
                            setActiveSubject(e.target.value);
                            setUploadSubject(e.target.value); 
                          }}
                          className="w-full appearance-none bg-transparent text-xl md:text-3xl font-black text-foreground outline-none cursor-pointer tracking-tight"
                        >
                          {SUBJECTS.map(sub => (
                             // The bg-background class here ensures the options don't become invisible in dark mode!
                             <option key={sub} value={sub} className="text-base font-semibold bg-background text-foreground">{sub}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Module Tabs */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {[1, 2, 3, 4, 5].map((mod) => (
                        <button
                          key={mod}
                          onClick={() => {
                            setActiveModule(mod);
                            setUploadModule(mod); 
                          }}
                          className={`rounded-xl px-5 py-2 text-sm font-bold transition-all duration-200 ${
                            activeModule === mod 
                            ? "bg-foreground text-background shadow-md transform scale-105" 
                            : "bg-surface text-muted border border-border hover:border-foreground/30 hover:text-foreground"
                          }`}
                        >
                          Module {mod}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isAdmin && (
                    <button onClick={() => setShowForm(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95">
                      <Plus size={20} /> Upload Resource
                    </button>
                  )}
                </div>
              </section>
            ) : (
              // Active Search Hero
              <section className="rounded-2xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 p-6 md:p-8 text-center">
                <h1 className="text-2xl font-black text-foreground">Searching Global Database</h1>
                <p className="text-muted mt-2">Showing all documents matching "{searchQuery}" across all subjects and modules.</p>
              </section>
            )}

            {/* Mobile nav (Categories) */}
            <nav className="flex gap-2 overflow-x-auto pb-2 md:hidden hide-scrollbar">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${activeNav === item.key ? "bg-primary text-primary-foreground shadow-md" : "border border-border bg-surface text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Resource Grid Header */}
            <div className="flex items-center justify-between pt-4 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  {isSearchingGlobal ? <Search size={20} className="text-primary"/> : null}
                  {isSearchingGlobal ? "Search Results" : activeNav === "dashboard" ? `All Materials (Module ${activeModule})` : activeLabel}
                </h2>
                <p className="text-sm font-medium text-muted mt-1">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? "resource" : "resources"} available
                </p>
              </div>
            </div>

            {/* Resource Grid */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface" />)}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface/50 py-24 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-muted shadow-sm mb-4">
                  <Search size={28} />
                </div>
                <p className="text-lg font-bold text-foreground">No documents found</p>
                <p className="mt-2 max-w-sm text-sm font-medium text-muted">
                  {isSearchingGlobal ? "Try adjusting your search terms or checking for typos." : "No materials have been uploaded for this specific module yet."}
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="group flex flex-col rounded-2xl border border-border bg-surface p-5 transition-all duration-300 hover:shadow-xl hover:shadow-foreground/5 hover:-translate-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${CATEGORY_STYLES[doc.category] ?? "bg-background text-muted ring-border"}`}>
                        {categoryLabel(doc.category)}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold leading-snug text-foreground line-clamp-2">{doc.title}</h3>
                    
                    {isSearchingGlobal && doc.module_id && (
                       <p className="mt-2 text-xs font-bold text-primary bg-primary/10 dark:bg-primary/20 w-fit px-2 py-1 rounded-md">Module {doc.module_id}</p>
                    )}
                    
                    <p className="mt-2 text-xs font-medium text-muted flex-1">Uploaded by {doc.uploaded_by || "Admin"}</p>
                    
                    <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary/10 dark:bg-primary/20 px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                        <Download size={18} /> Download
                      </a>
                      {isAdmin && (
                        <button onClick={() => handleDelete(doc.id)} className="inline-flex items-center justify-center rounded-xl border border-border bg-surface p-2.5 text-muted hover:border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DYNAMIC UPLOAD MODAL */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl dark:shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border bg-background/50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                  <Upload size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">Upload Resource</h2>
                  <p className="text-xs font-medium text-muted">Add files to the central database</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-full p-2 text-muted hover:bg-border hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-5 px-6 py-6">
              
              <div className="rounded-xl border border-border bg-background p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Target Subject</label>
                  <select value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                    {/* The bg-background class ensures dropdown items don't blend into invisible text in dark mode */}
                    {SUBJECTS.map(sub => <option key={sub} value={sub} className="bg-background text-foreground">{sub}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">Target Module</label>
                  <select value={uploadModule} onChange={(e) => setUploadModule(Number(e.target.value))} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                     {[1, 2, 3, 4, 5].map(mod => <option key={mod} value={mod} className="bg-background text-foreground">Module {mod}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground">Document Title</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Newton's Laws Summary" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    <option value="notes" className="bg-background text-foreground">Notes</option>
                    <option value="pyq" className="bg-background text-foreground">PYQ (Previous Year Question)</option>
                    <option value="syllabus" className="bg-background text-foreground">Syllabus</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Uploader Name</label>
                  <input type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} placeholder="Admin" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-foreground">PDF File</label>
                <div className="rounded-xl border-2 border-dashed border-border bg-background p-2 transition-colors hover:border-primary/50">
                  <input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm font-medium text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary-foreground hover:file:bg-blue-700 file:cursor-pointer file:transition-colors cursor-pointer" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-bold text-muted hover:bg-border hover:text-foreground transition-all">Cancel</button>
                <button disabled={uploading} type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-blue-700 disabled:opacity-60 transition-all shadow-lg shadow-primary/20">
                  {uploading ? "Encrypting & Uploading..." : "Submit to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}