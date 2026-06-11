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
  FileText, Download, GraduationCap, Plus, Upload, X, LogOut,
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

interface StudyHistory extends Document {
  timestamp: number;
}

type NavKey = "dashboard" | "notes" | "pyq" | "syllabus" | "bookmarks" | "recent";

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "pyq", label: "PYQs", icon: FileQuestion },
  { key: "syllabus", label: "Syllabus", icon: ListChecks },
];

const CATEGORY_STYLES: Record<string, string> = {
  notes: "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1] ring-[#4F46E5]/20",
  pyq: "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1] ring-[#4F46E5]/20",
  syllabus: "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1] ring-[#4F46E5]/20",
};

const CATEGORY_ICON_STYLES: Record<string, string> = {
  notes: "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]",
  pyq: "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]",
  syllabus: "bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]",
};

const SUBJECTS = [
  "MATHS 1", "MATHS 2", "PHYSICS", "BEE", "PPS", "BIOLOGY", "WORKSHOP",
  "PHYSICS LAB", "COMMUNICATION SKILLS", "CHEMISTRY", "BME", "BE",
  "ENVIRONMENTAL SCIENCE", "BE LAB", "BEE LAB", "CHEMISTRY LAB", "NSS",
  "ENGINEERING GRAPHICS"
];

// Helper to determine if a subject uses modules
const isNonModuleSubject = (subject?: string) => {
  if (!subject) return false;
  const upperCaseSubject = subject.toUpperCase();
  const explicitNonModules = ["WORKSHOP", "ENGINEERING GRAPHICS", "COMMUNICATION SKILLS", "NSS"];
  return explicitNonModules.includes(upperCaseSubject) || upperCaseSubject.endsWith("LAB");
};

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
  const [recentStudy, setRecentStudy] = useState<StudyHistory | null>(null);

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
    
    // Enforce Dark Mode as Default
    const html = document.documentElement;
    const storedTheme = localStorage.getItem("theme");
    
    if (storedTheme === "light") {
      html.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }

    // Load Local Data
    const storedBookmarks = localStorage.getItem("portal_bookmarks");
    if (storedBookmarks) {
      setBookmarks(JSON.parse(storedBookmarks));
    }
    const history = localStorage.getItem("portal_study_history");
    if (history) {
      setRecentStudy(JSON.parse(history));
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

  const trackStudyActivity = (doc: Document) => {
    const historyItem: StudyHistory = {
      ...doc,
      timestamp: Date.now(),
    };
    setRecentStudy(historyItem);
    localStorage.setItem("portal_study_history", JSON.stringify(historyItem));
  };

  const handleForceDownload = (e: React.MouseEvent, url: string, title: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    const safeTitle = title.replace(/[^a-zA-Z0-9 \-_]/g, '').trim() || 'document';
    const downloadUrl = url.includes('?') 
      ? `${url}&download=${encodeURIComponent(safeTitle)}.pdf` 
      : `${url}?download=${encodeURIComponent(safeTitle)}.pdf`;
      
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `${safeTitle}.pdf`); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      let data = [];
      const isNonModule = isNonModuleSubject(activeSubject);
      
      if (activeNav === "recent" || activeNav === "bookmarks" || activeNav === "syllabus" || isNonModule) {
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
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

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
      
      const isNonModule = isNonModuleSubject(activeSubject);
      const matchesModule = (activeNav === "syllabus" || isNonModule) ? true : doc.module_id === activeModule;

      return matchesSubject && matchesCategory && matchesModule;
    });
  }, [documents, isSearchingGlobal, activeSubject, activeNav, bookmarks, activeModule]);

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

  const isCurrentNonModule = isNonModuleSubject(activeSubject);
  const hideModuleSelector = activeNav === "syllabus" || isCurrentNonModule;
  
  const isUploadNonModule = isNonModuleSubject(uploadSubject);
  const hideUploadModule = category === "syllabus" || isUploadNonModule;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FAFAF9] dark:bg-[#0B1020] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-300">

      {/* ============================ HEADER ============================ */}
      <header className="sticky top-0 z-30 border-b border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF]/80 dark:bg-[#111827]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 md:px-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <button 
              onClick={() => setSidebarCollapsed((v) => !v)} 
              className="hidden rounded-xl p-2 text-[#64748B] dark:text-[#94A3B8] transition-colors hover:bg-[#E5E7EB]/50 dark:hover:bg-[#1F2A44]/50 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] lg:inline-flex"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/30">
              <GraduationCap size={20} />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">Academic Portal</p>
              <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">First-Year B.Tech Hub</p>
            </div>
          </div>

          <div className="flex flex-1 justify-center min-w-0 px-2">
            <div className="group relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8] transition-colors group-focus-within:text-[#4F46E5]" size={18} />
              <input
                type="text"
                placeholder="Search notes, PYQs, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search resources"
                className="h-10 w-full rounded-full border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] pl-11 pr-10 text-sm font-medium text-[#0F172A] dark:text-[#F8FAFC] shadow-sm outline-none transition-all placeholder:[#64748B] dark:placeholder:[#94A3B8] focus:border-[#4F46E5] focus:bg-[#FFFFFF] dark:focus:bg-[#111827] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#64748B] dark:text-[#94A3B8] transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#131D33] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
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
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] text-[#64748B] dark:text-[#94A3B8] shadow-sm transition-all hover:bg-[#F8FAFC] dark:hover:bg-[#131D33] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
              aria-label="Toggle theme"
            >
              {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : <div className="h-4 w-4" />}
            </button>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 ring-1 ring-emerald-500/20 sm:inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" /> Admin
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-3 text-sm font-semibold text-[#64748B] dark:text-[#94A3B8] transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
        <aside className={`sticky top-16 self-start hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF]/40 dark:bg-[#111827]/40 py-6 transition-all duration-300 lg:flex ${sidebarCollapsed ? 'w-[72px] px-2 items-center' : 'w-64 px-3'}`}>
          
          <div className="w-full">
            {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Browse</p>}
            <nav className="space-y-1 w-full">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.key;
                const count = subjectDocs.filter((d) => item.key === "dashboard" || d.category === item.key).length;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveNav(item.key)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${active ? "bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/30" : "text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#131D33] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"} ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                    {!sidebarCollapsed && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-[#FAFAF9] dark:bg-[#0B1020] text-[#64748B] dark:text-[#94A3B8]"}`}>{count}</span>}
                  </button>
                );
              })}
            </nav>

            {!sidebarCollapsed && <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Library</p>}
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
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${active ? "bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/30" : "text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#131D33] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"} ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!sidebarCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto w-full pt-6">
            {!sidebarCollapsed && (
              <>
                <div className="rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-gradient-to-br from-[#4F46E5]/5 to-transparent p-4 mb-4">
                  <p className="text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">Advanced search and analytics coming soon.</p>
                </div>
                <div className="px-3 flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-[#64748B]/70 dark:text-[#94A3B8]/70">Academic Portal v1.0.0</p>
                  <p className="text-[9px] text-[#64748B]/50 dark:text-[#94A3B8]/50">&copy; {new Date().getFullYear()} B.Tech Hub</p>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* ============================ MAIN ============================ */}
        <main className="flex-1 px-4 pb-16 pt-6 md:px-6 lg:px-8 w-full min-w-0 overflow-x-clip">
          <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-6">

            {/* HERO & DYNAMIC HEADERS */}
            {!isSearchingGlobal && activeNav !== "bookmarks" && activeNav !== "recent" && (
              <section className="animate-fade-up relative overflow-hidden w-full rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-5 shadow-sm md:p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#4F46E5]/5 blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-3 py-1 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    <GraduationCap size={14} className="text-[#4F46E5] dark:text-[#6366F1]" /> Academic Portal
                  </div>
                  
                  <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#0F172A] dark:text-[#F8FAFC] sm:text-4xl md:text-5xl break-words whitespace-normal text-wrap">
                    Everything a first-year <span className="text-[#4F46E5] dark:text-[#6366F1]">B.Tech student</span> needs
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8] md:text-base break-words text-wrap">
                    Resources, PYQs, notes, assignments and syllabus beautifully organized in one place.
                  </p>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2 w-full sm:max-w-md">
                    {[
                      { label: "Subjects", value: SUBJECTS.length, icon: BookOpen },
                      { label: "Resources", value: subjectDocs.length, icon: FileText },
                      { label: "Modules", value: subjectModules || 0, icon: Layers },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] p-2.5 min-w-0">
                        <Icon size={16} className="text-[#4F46E5] dark:text-[#6366F1]" />
                        <p className="mt-1.5 text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] truncate">{value}</p>
                        <p className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider truncate">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* CONTINUE STUDYING FEATURE */}
            {activeNav === "dashboard" && !isSearchingGlobal && (
              <section className="animate-fade-up w-full mt-2 mb-2">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-3 px-1">
                  Continue Studying
                </h2>
                {recentStudy ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#F8FAFC] dark:bg-[#131D33] p-4 shadow-sm transition-all hover:border-[#4F46E5]/40">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]">
                        <Clock size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]" title={recentStudy.title}>
                          {recentStudy.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          {recentStudy.subject && <span className="font-semibold text-[#4F46E5] dark:text-[#6366F1] truncate max-w-[140px]">{recentStudy.subject}</span>}
                          {recentStudy.module_id && recentStudy.category !== "syllabus" && !isNonModuleSubject(recentStudy.subject) && <span>• Module {recentStudy.module_id}</span>}
                          <span className="uppercase tracking-wider"> • {recentStudy.category}</span>
                          <span>• Accessed {formatDate(new Date(recentStudy.timestamp).toISOString())}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:w-auto w-full">
                      <button
                        onClick={() => {
                          setPreviewDoc(recentStudy);
                          trackStudyActivity(recentStudy);
                        }}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5]/10 px-4 py-2.5 text-xs font-bold text-[#4F46E5] dark:text-[#6366F1] transition-all hover:bg-[#4F46E5] hover:text-white"
                      >
                        <Eye size={14} /> Resume Reading
                      </button>
                      <button
                        onClick={(e) => {
                          trackStudyActivity(recentStudy);
                          handleForceDownload(e, recentStudy.file_url, recentStudy.title);
                        }}
                        className="inline-flex items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-2.5 text-[#64748B] dark:text-[#94A3B8] transition-all hover:border-[#4F46E5] hover:bg-[#4F46E5]/5 hover:text-[#4F46E5] dark:hover:text-[#6366F1]"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] py-8 text-center">
                    <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">No recent study activity yet.</p>
                  </div>
                )}
              </section>
            )}

            {isSearchingGlobal && (
              <section className="animate-fade-up w-full rounded-2xl border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white">
                    <Search size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] md:text-xl truncate">Search results</h1>
                    <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] truncate">Matching &ldquo;{searchQuery}&rdquo; across all subjects</p>
                  </div>
                </div>
              </section>
            )}

            {activeNav === "bookmarks" && !isSearchingGlobal && (
               <section className="animate-fade-up w-full rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]">
                    <Bookmark size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] md:text-xl truncate">Your Saved Bookmarks</h1>
                    <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] truncate">Quick access to your most important resources.</p>
                  </div>
                </div>
              </section>
            )}

            {activeNav === "recent" && !isSearchingGlobal && (
               <section className="animate-fade-up w-full rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] md:text-xl truncate">Recently Uploaded</h1>
                    <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] truncate">The latest resources added to the database.</p>
                  </div>
                </div>
              </section>
            )}

            {/* SUBJECT + MODULE CONTROLS */}
            {!isSearchingGlobal && activeNav !== "bookmarks" && activeNav !== "recent" && (
              <section className="animate-fade-up w-full space-y-4 rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between w-full">
                  <div className="w-full space-y-1.5 sm:max-w-xs min-w-0">
                    <label htmlFor="hero-subject" className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Subject Domain</label>
                    <div className="group relative w-full">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#64748B] dark:text-[#94A3B8] transition-colors group-focus-within:text-[#4F46E5]">
                        <BookOpen size={16} />
                      </div>
                      <select
                        id="hero-subject"
                        value={activeSubject}
                        onChange={(e) => {
                          setActiveSubject(e.target.value);
                          setUploadSubject(e.target.value);
                        }}
                        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] pl-9 pr-10 text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 truncate"
                      >
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <ChevronRight size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#64748B] dark:text-[#94A3B8]" />
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white shadow-sm shadow-[#4F46E5]/30 transition-all hover:bg-[#6366F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1020]"
                    >
                      <Plus size={16} /> Upload Resource
                    </button>
                  )}
                </div>

                {!hideModuleSelector && (
                  <div className="w-full">
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
                            className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] min-w-0 ${
                              active
                                ? "border-[#4F46E5] bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/30"
                                : "border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] text-[#64748B] dark:text-[#94A3B8] hover:border-[#4F46E5]/40 hover:text-[#0F172A] dark:hover:text-[#F8FAFC]"
                            }`}
                            aria-pressed={active}
                          >
                            <Layers size={14} className={`shrink-0 ${active ? "text-white" : "text-[#64748B] dark:text-[#94A3B8]"}`} />
                            <span className="truncate">Module {mod}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* SEGMENTED CONTROL FOR MOBILE */}
            <div className="w-full lg:hidden min-w-0">
              <nav className="flex gap-2 overflow-x-auto hide-scrollbar pb-2" aria-label="Resource categories">
                {[...NAV_ITEMS, {key: "bookmarks", label: "Bookmarks", icon: Bookmark}, {key: "recent", label: "Recent", icon: Clock}].map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveNav(item.key as NavKey)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${active ? "bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/30" : "border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8]"}`}
                    >
                      <Icon size={14} /> {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* GRID HEADER */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E5E7EB] dark:border-[#1F2A44] pb-3 w-full">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] md:text-lg truncate">
                  {isSearchingGlobal ? <TrendingUp size={18} className="shrink-0 text-[#4F46E5] dark:text-[#6366F1]" /> : <FolderOpen size={18} className="shrink-0 text-[#4F46E5] dark:text-[#6366F1]" />}
                  <span className="truncate">
                    {isSearchingGlobal
                      ? "Global Search"
                      : activeNav === "dashboard"
                      ? (hideModuleSelector ? activeSubject : `${activeSubject} · Module ${activeModule}`)
                      : activeLabel}
                  </span>
                </h2>
                <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? "resource" : "resources"} available
                </p>
              </div>
            </div>

            {/* CONTENT GRID */}
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 w-full">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] w-full" />
                ))}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] px-6 py-16 text-center w-full">
                <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1] ring-1 ring-[#4F46E5]/20">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-base font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">No resources available yet</h3>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
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
                    className="animate-fade-up group flex flex-col rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#F8FAFC] dark:bg-[#131D33] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4F46E5]/40 hover:shadow-lg hover:shadow-[#4F46E5]/5 min-w-0"
                    style={{ animationDelay: `${Math.min(idx * 40, 240)}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${CATEGORY_ICON_STYLES[doc.category] ?? "bg-[#4F46E5]/10 text-[#4F46E5]"}`}>
                        <FileText size={18} />
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 shrink-0 ${CATEGORY_STYLES[doc.category] ?? "bg-[#FAFAF9] text-[#64748B] ring-[#E5E7EB]"}`}>
                        {categoryLabel(doc.category)}
                      </span>
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-[#0F172A] dark:text-[#F8FAFC] break-words" title={doc.title}>
                      {doc.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {(isSearchingGlobal || activeNav === "recent" || activeNav === "bookmarks") && doc.subject && (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#4F46E5] dark:text-[#6366F1] truncate">
                          <BookOpen size={10} className="shrink-0" /> <span className="truncate">{doc.subject}</span>
                        </span>
                      )}
                      {doc.module_id && doc.category !== "syllabus" && !isNonModuleSubject(doc.subject) && (
                        <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                          <Layers size={10} className="shrink-0" /> Module {doc.module_id}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} className="shrink-0" /> {formatDate(doc.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 flex-1 text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                      By <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{doc.uploaded_by || "Admin"}</span>
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-[#E5E7EB] dark:border-[#1F2A44] pt-3">
                      <button
                        onClick={(e) => {
                          trackStudyActivity(doc);
                          handleForceDownload(e, doc.file_url, doc.title);
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] transition-all hover:border-[#4F46E5] hover:bg-[#4F46E5]/5 hover:text-[#4F46E5] dark:hover:text-[#6366F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] min-w-0"
                      >
                        <Download size={14} className="shrink-0" /> <span className="truncate">Download</span>
                      </button>
                      <button
                        onClick={() => {
                          setPreviewDoc(doc);
                          trackStudyActivity(doc);
                        }}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-2 text-[#64748B] dark:text-[#94A3B8] transition-all hover:border-[#4F46E5] hover:bg-[#4F46E5]/10 hover:text-[#4F46E5] dark:hover:text-[#6366F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                        aria-label="Preview document"
                        title="Preview PDF"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleBookmark(doc.id)}
                        className={`inline-flex shrink-0 items-center justify-center rounded-xl border p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] ${isBookmarked ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]' : 'border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:border-[#4F46E5] hover:bg-[#4F46E5]/5 hover:text-[#4F46E5] dark:hover:text-[#6366F1]'}`}
                        aria-label="Bookmark document"
                        title={isBookmarked ? "Remove Bookmark" : "Bookmark PDF"}
                      >
                        <Bookmark size={16} className={isBookmarked ? "fill-[#F59E0B]" : ""} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] p-2 text-[#64748B] dark:text-[#94A3B8] transition-all hover:border-red-500 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
          <div className="absolute inset-0 bg-[#FAFAF9]/80 dark:bg-[#0B1020]/80 backdrop-blur-sm" onClick={() => setShowForm(false)} aria-hidden="true" />
          <div className="animate-fade-up relative z-10 w-full max-w-xl overflow-hidden rounded-t-3xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white">
                  <Upload size={14} />
                </div>
                <div>
                  <h2 id="modal-title" className="text-sm font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">Upload Resource</h2>
                  <p className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">Add files to the central library</p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl p-2 text-[#64748B] dark:text-[#94A3B8] transition-colors hover:bg-[#E5E7EB]/50 dark:hover:bg-[#1F2A44]/50 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="target-subject" className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Subject</label>
                  <select id="target-subject" value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] px-3 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20">
                    {SUBJECTS.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
                
                <div className={`space-y-1 ${hideUploadModule ? "opacity-50 pointer-events-none" : ""}`}>
                  <label htmlFor="target-module" className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Module</label>
                  <select id="target-module" value={hideUploadModule ? 1 : uploadModule} onChange={(e) => setUploadModule(Number(e.target.value))} disabled={hideUploadModule} className="h-10 w-full cursor-pointer rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] px-3 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 disabled:cursor-not-allowed">
                    {[1, 2, 3, 4, 5].map((mod) => <option key={mod} value={mod}>Module {mod}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="doc-title" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Document Title</label>
                <input id="doc-title" required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Newton's Laws Summary" className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-3 text-xs text-[#0F172A] dark:text-[#F8FAFC] outline-none transition-all placeholder:[#64748B] dark:placeholder:[#94A3B8] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="doc-category" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Category</label>
                  <select id="doc-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-3 text-xs text-[#0F172A] dark:text-[#F8FAFC] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20">
                    <option value="notes">Notes</option>
                    <option value="pyq">PYQ (Previous Year Question)</option>
                    <option value="syllabus">Syllabus</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="doc-uploader" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Uploader Name</label>
                  <input id="doc-uploader" type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} placeholder="Admin" className="h-10 w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-3 text-xs text-[#0F172A] dark:text-[#F8FAFC] outline-none transition-all placeholder:[#64748B] dark:placeholder:[#94A3B8] focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20" />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="doc-file" className="text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">PDF File</label>
                <div className="rounded-xl border border-dashed border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] p-1.5 transition-colors focus-within:border-[#4F46E5] hover:border-[#4F46E5]/50">
                  <input id="doc-file" required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full cursor-pointer text-xs font-medium text-[#64748B] dark:text-[#94A3B8] outline-none file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-[#E5E7EB] dark:file:border-[#1F2A44] file:bg-[#FFFFFF] dark:file:bg-[#111827] file:px-3 file:py-1.5 file:font-semibold file:text-[#0F172A] dark:file:text-[#F8FAFC] hover:file:bg-[#E5E7EB]/50 dark:hover:file:bg-[#1F2A44]/50" />
                </div>
              </div>

              <div className="mt-5 flex gap-3 border-t border-[#E5E7EB] dark:border-[#1F2A44] pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="h-10 flex-1 rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] transition-all hover:bg-[#FAFAF9] dark:hover:bg-[#131D33] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]">Cancel</button>
                <button disabled={uploading} type="submit" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#6366F1] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1020]">
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
          <div className="absolute inset-0 bg-[#FAFAF9]/80 dark:bg-[#0B1020]/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} aria-hidden="true" />
          <div className="animate-fade-up relative z-10 flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] shadow-2xl">
            
            <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#6366F1]">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id="preview-title" className="truncate text-sm font-extrabold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]" title={previewDoc.title}>
                    {previewDoc.title}
                  </h2>
                  <p className="truncate text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {previewDoc.subject}
                    {previewDoc.module_id && previewDoc.category !== "syllabus" && !isNonModuleSubject(previewDoc.subject) && ` • Module ${previewDoc.module_id}`}
                  </p>
                </div>
              </div>
              
              <div className="flex shrink-0 items-center gap-2 pl-4">
                <button
                  onClick={(e) => handleForceDownload(e, previewDoc.file_url, previewDoc.title)}
                  className="hidden sm:inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#6366F1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1020]"
                >
                  <Download size={14} className="shrink-0" /> <span className="hidden md:inline">Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] p-2 text-[#64748B] dark:text-[#94A3B8] transition-all hover:bg-[#E5E7EB]/50 dark:hover:bg-[#1F2A44]/50 hover:text-[#0F172A] dark:hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
                  aria-label="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-[#E5E7EB]/20 dark:bg-[#1F2A44]/20 p-2 sm:p-4">
              <iframe
                src={`${previewDoc.file_url}#view=FitH`}
                className="h-full w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF] dark:bg-[#111827] shadow-sm"
                title={`Preview of ${previewDoc.title}`}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}