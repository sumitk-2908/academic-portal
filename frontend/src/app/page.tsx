"use client";

import { useEffect, useState } from "react";
import {
  getDocumentsByModule,
  uploadDocument,
  deleteDocument,
  supabase,
} from "./lib/api";
import {
  FileText,
  Download,
  GraduationCap,
  Plus,
  Upload,
  X,
  Lock,
  LogOut,
  Trash2,
  LayoutDashboard,
  NotebookPen,
  FileQuestion,
  ListChecks,
  PanelLeftClose,
  PanelLeft,
  Search,
  BookOpen
} from "lucide-react";

interface Document {
  id: number;
  title: string;
  category: string;
  file_url: string;
  uploaded_by: string;
  created_at: string;
  module_id?: number;
}

type NavKey = "dashboard" | "notes" | "pyq" | "syllabus";

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "notes", label: "Notes", icon: NotebookPen },
  { key: "pyq", label: "PYQs", icon: FileQuestion },
  { key: "syllabus", label: "Syllabus", icon: ListChecks },
];

const CATEGORY_STYLES: Record<string, string> = {
  notes: "bg-blue-50 text-blue-700 ring-blue-200",
  pyq: "bg-amber-50 text-amber-700 ring-amber-200",
  syllabus: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

// Hardcoded for now, but these could come from your database later!
const SUBJECTS = [
  "C Programming",
  "Electrical Engineering",
  "Engineering Mechanics",
  "Mathematics II",
  "Physics"
];

function categoryLabel(category: string) {
  if (category === "pyq") return "PYQ";
  return category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ");
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // --- Auth states ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  // --- UI & Navigation states ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  
  // --- Hierarchy states ---
  const [activeSubject, setActiveSubject] = useState(SUBJECTS[0]);
  const [activeModule, setActiveModule] = useState(1); // Modules 1 through 5

  // --- Upload form states ---
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("notes");
  const [uploadedBy, setUploadedBy] = useState("");

  const fetchDocs = async () => {
    setLoading(true);
    try {
      // Fetching documents specifically for the active module
      const data = await getDocumentsByModule(activeModule);
      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch documents whenever the active module changes
  useEffect(() => {
    fetchDocs();
  }, [activeModule]);

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
    // Dynamically assign the upload to the currently selected module!
    formData.append("module_id", String(activeModule)); 
    formData.append("uploaded_by", uploadedBy || "Admin");

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

  // The Master Filter: Checks Nav Category AND the Global Search Bar
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = activeNav === "dashboard" || doc.category === activeNav;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeNav)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-foreground md:inline-flex"
          >
            {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap size={20} />
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-foreground">Academic Portal</p>
              <p className="text-xs text-muted">Semester 2 Hub</p>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex flex-1 items-center justify-center px-4 md:px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input
              type="text"
              placeholder="Search notes, PYQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAdmin ? (
            <div className="relative">
              <button
                onClick={() => setShowLogin((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700"
              >
                <Lock size={16} /> Admin
              </button>

              {showLogin && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowLogin(false)} tabIndex={-1} />
                  <form onSubmit={handleAdminLogin} className="absolute right-0 top-12 z-20 w-72 rounded-xl border border-border bg-surface p-4 shadow-lg">
                    <p className="mb-3 text-sm font-semibold text-foreground">Sign in to manage resources</p>
                    <div className="space-y-2">
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" required />
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" required />
                      {authError && <p className="text-xs font-medium text-destructive">{authError}</p>}
                      <button type="submit" className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-blue-700">Login</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Admin Mode
              </span>
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-muted hover:bg-background hover:text-foreground">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-surface p-3 transition-all duration-200 md:block ${sidebarCollapsed ? "w-[68px]" : "w-60"}`}>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted hover:bg-background hover:text-foreground"} ${sidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon size={20} className="shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            
            {/* Hero Section with Subject & Module Selection */}
            <section className="rounded-xl border border-border bg-surface p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                
                <div className="flex-1 space-y-4">
                  {/* Subject Selector Dropdown */}
                  <div className="flex items-center gap-2 text-primary">
                    <BookOpen size={18} />
                    <select 
                      value={activeSubject}
                      onChange={(e) => setActiveSubject(e.target.value)}
                      className="cursor-pointer appearance-none bg-transparent text-sm font-semibold hover:text-blue-700 focus:outline-none"
                    >
                      {SUBJECTS.map(sub => (
                         <option key={sub} value={sub} className="text-foreground">{sub}</option>
                      ))}
                    </select>
                  </div>
                  
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                    {activeSubject} Resources
                  </h1>

                  {/* Module Tabs */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {[1, 2, 3, 4, 5].map((mod) => (
                      <button
                        key={mod}
                        onClick={() => setActiveModule(mod)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                          activeModule === mod 
                          ? "bg-foreground text-background shadow-sm" 
                          : "bg-background text-muted border border-border hover:border-foreground/30 hover:text-foreground"
                        }`}
                      >
                        Module {mod}
                      </button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <button onClick={() => setShowForm(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-blue-700">
                    <Plus size={18} /> Upload PDF
                  </button>
                )}
              </div>
            </section>

            {/* Mobile nav (Categories) */}
            <nav className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeNav === item.key ? "bg-primary/10 text-primary" : "border border-border bg-surface text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Resource Grid Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {searchQuery ? `Search results for "${searchQuery}"` : activeNav === "dashboard" ? `All Module ${activeModule} Materials` : activeLabel}
                </h2>
                <p className="text-sm text-muted">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? "resource" : "resources"} found
                </p>
              </div>
            </div>

            {/* Resource Grid */}
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-surface" />)}
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
                  <Search size={22} />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">No documents found</p>
                <p className="mt-1 text-sm text-muted">
                  {searchQuery ? "Try adjusting your search terms." : "No materials have been uploaded for this module yet."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText size={22} />
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CATEGORY_STYLES[doc.category] ?? "bg-background text-muted ring-border"}`}>
                        {categoryLabel(doc.category)}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold leading-snug text-foreground text-pretty">{doc.title}</h3>
                    <p className="mt-1 text-sm text-muted">Uploaded by {doc.uploaded_by || "Admin"}</p>
                    <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-blue-700">
                        <Download size={16} /> Download
                      </a>
                      {isAdmin && (
                        <button onClick={() => handleDelete(doc.id)} className="inline-flex items-center justify-center rounded-lg border border-border bg-surface p-2 text-muted hover:border-destructive hover:bg-destructive hover:text-white">
                          <Trash2 size={18} />
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

      {/* Upload Modal */}
      {isAdmin && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setShowForm(false)} tabIndex={-1} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Upload size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Upload Document</h2>
                  {/* Dynamically tells the admin where they are uploading to! */}
                  <p className="text-xs text-muted">Adding to {activeSubject} - Module {activeModule}</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Document Title</label>
                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 1 Summary" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="notes">Notes</option>
                    <option value="pyq">PYQ (Previous Year Question)</option>
                    <option value="syllabus">Syllabus</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Uploader Name</label>
                  <input type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} placeholder="Admin" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">PDF File</label>
                <input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-muted hover:bg-background hover:text-foreground">Cancel</button>
                <button disabled={uploading} type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60">
                  {uploading ? "Uploading..." : "Submit Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}