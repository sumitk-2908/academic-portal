"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, getTrendingDocuments, uploadDocument, getStudentBookmarks, getRecentStudyActivity } from "./lib/api";
import { 
  GraduationCap, Search, Moon, Sun, LogOut, PanelLeft, 
  PanelLeftClose, TrendingUp, X, BookOpen, Bookmark, Clock, 
  Upload, Inbox, Plus, FileText, Home
} from "lucide-react";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const SUBJECTS_LIST = [
  "MATHS 1", "MATHS 2", "PHYSICS", "BEE", "PPS", "BIOLOGY", "WORKSHOP",
  "PHYSICS LAB", "COMMUNICATION SKILLS", "CHEMISTRY", "BME", "BE",
  "ENVIRONMENTAL SCIENCE", "BE LAB", "BEE LAB", "CHEMISTRY LAB", "NSS",
  "ENGINEERING GRAPHICS"
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Global Data States
  const [searchQuery, setSearchQuery] = useState("");
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [trendingDocs, setTrendingDocs] = useState<any[]>([]);
  const [recentStudy, setRecentStudy] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Auth States
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Upload States
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("notes");
  const [uploadedBy, setUploadedBy] = useState("");
  const [uploadSubject, setUploadSubject] = useState("MATHS 1");
  const [uploadModule, setUploadModule] = useState(1);

  const refreshSidebarData = useCallback(async (currentUserId?: string) => {
    const { data: docs } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (docs) setAllDocs(docs);

    getTrendingDocuments().then(setTrendingDocs);

    const history = await getRecentStudyActivity(currentUserId);
    setRecentStudy(history);

    const userBookmarks = await getStudentBookmarks(currentUserId);
    setBookmarks(userBookmarks);
  }, []);

  const syncUserFromSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      
      const isDbAdmin = roleData?.role === 'admin';
      const isPortalAdminFlow = sessionStorage.getItem("admin_portal_auth") === "true";

      // Strict enforcement: DB Role + Admin Portal Login Context required
      if (isDbAdmin && isPortalAdminFlow) {
        setIsAdmin(true); setIsStudent(false);
      } else {
        setIsAdmin(false); setIsStudent(true);
        // Safely split the email, falling back to "Student" if undefined
        setUploadedBy(session.user.email?.split('@')[0] || "Student");
      }
      refreshSidebarData(session.user.id);
    } else {
      setIsAdmin(false); setIsStudent(false);
      refreshSidebarData();
    }
  }, [refreshSidebarData]);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("theme") === "dark") setIsDarkMode(true);

    const initializeData = async () => {
      const { data: sess } = await supabase.auth.getSession();
      await refreshSidebarData(sess?.session?.user?.id);
    };
    initializeData();

    const handleUpdate = async () => {
      const { data: sess } = await supabase.auth.getSession();
      refreshSidebarData(sess?.session?.user?.id);
    };

    window.addEventListener("sidebar_update", handleUpdate);
    return () => window.removeEventListener("sidebar_update", handleUpdate);
  }, [pathname]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => syncUserFromSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserFromSession(session);
    });

    return () => subscription.unsubscribe();
  }, [syncUserFromSession]);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark"); localStorage.setItem("theme", "light"); setIsDarkMode(false);
    } else {
      html.classList.add("dark"); localStorage.setItem("theme", "dark"); setIsDarkMode(true);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    // SECURITY: Ensure standard student login clears any residual admin context
    sessionStorage.removeItem("admin_portal_auth");

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
          options: { emailRedirectTo: window.location.origin } // PRODUCTION REDIRECT FIX
        });
        if (error) throw error;

        if (data.session) {
          await syncUserFromSession(data.session);
          setAuthPassword("");
          setShowAuthModal(false);
        } else {
          alert("Registration complete! Please check your email to verify your account before logging in.");
          setAuthMode("signin");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;

        await syncUserFromSession(data.session);
        setAuthPassword("");
        setShowAuthModal(false);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Dedicated secure logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("admin_portal_auth");
    setIsAdmin(false);
    setIsStudent(false);
    router.push('/');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please map a PDF resource!");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file); formData.append("title", uploadTitle);
    formData.append("category", uploadCategory); formData.append("module_id", String(uploadModule));
    formData.append("uploaded_by", uploadedBy || (isAdmin ? "Admin" : "Student"));
    formData.append("subject", uploadSubject); formData.append("status", isAdmin ? "approved" : "pending");

    try {
      await uploadDocument(formData);
      setFile(null); setUploadTitle(""); setShowUploadForm(false);
      const { data: sess } = await supabase.auth.getSession();
      refreshSidebarData(sess?.session?.user?.id);
      if (!isAdmin) alert("Notes submitted! Pending admin approval.");
    } catch (err) {
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  // --- OMNIPRESENT GLOBAL SEARCH ENGINE ---
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allDocs.filter(doc => 
      doc.status === 'approved' &&
      (doc.title.toLowerCase().includes(query) || 
       doc.subject.toLowerCase().includes(query) || 
       doc.category.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [searchQuery, allDocs]);

  const pendingCount = allDocs.filter(d => d.status === 'pending').length;
  const recentUploads = allDocs.filter(d => d.status === 'approved').slice(0, 5);

  return (
    <div className="flex min-h-[100dvh] flex-col transition-colors duration-300">
      
      {/* ========================================= */}
      {/* 1. THE ONLY GLOBAL HEADER */}
      {/* ========================================= */}
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF]/90 dark:bg-[#111827]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 md:px-6">
          
          {/* Branding */}
          <div className="flex shrink-0 items-center gap-2.5">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden rounded-xl p-2 text-[#64748B] hover:bg-[#E5E7EB]/50 lg:inline-flex dark:text-[#94A3B8] dark:hover:bg-[#1F2A44]/50">
              {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4F46E5] text-white shadow-sm">
                <GraduationCap size={20} />
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-extrabold tracking-tight">Academic Portal</p>
              </div>
            </Link>
          </div>

          {/* Omnipresent Search Bar */}
          <div className="flex flex-1 justify-center min-w-0 relative group">
            <div className="w-full max-w-2xl relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
              <input
                type="text"
                placeholder="Search globally for PDFs, PYQs, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-full border border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FAFAF9] dark:bg-[#0B1020] pl-11 pr-10 text-sm outline-none focus:border-[#4F46E5]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]">
                  <X size={14} />
                </button>
              )}

              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="absolute top-12 left-0 w-full rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827] z-50">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase text-[#64748B]">Global Search Results</p>
                  {globalSearchResults.map(doc => (
                    <Link 
                      key={doc.id} 
                      href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`}
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#F8FAFC] dark:hover:bg-[#1F2A44]"
                    >
                      <FileText size={16} className="text-[#4F46E5]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{doc.title}</p>
                        <p className="text-[10px] text-[#64748B] uppercase">{doc.subject} • {doc.category}</p>
                      </div>
                    </Link>
                  ))}
                  {globalSearchResults.length === 0 && <p className="p-4 text-xs text-center text-[#64748B]">No matching documents found.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Theme & Auth Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44]">
              {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : null}
            </button>
            
            {(isAdmin || isStudent) ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowUploadForm(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white hover:bg-[#6366F1]">
                  <Plus size={14} /> <span className="hidden sm:inline">{isAdmin ? "Upload" : "Contribute"}</span>
                </button>
                <button onClick={handleLogout} className="flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm text-[#64748B] hover:bg-red-50 hover:text-red-500 dark:border-[#1F2A44]">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex h-9 items-center rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#6366F1]">
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        
        {/* ========================================= */}
        {/* 2. THE ONLY OMNIPRESENT SIDEBAR */}
        {/* ========================================= */}
        <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-[#E5E7EB] bg-[#FAFAF9]/50 py-6 dark:border-[#1F2A44] dark:bg-[#0B1020]/50 lg:flex ${sidebarCollapsed ? 'w-[72px] px-2' : 'w-[280px] px-4'}`}>
          <div className="space-y-6 flex-1">
            
            {/* Section: Navigation */}
            <div>
              {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase text-[#64748B]">Navigation</p>}
              <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-[#4F46E5] dark:hover:bg-[#111827]">
                <Home size={18} /> {!sidebarCollapsed && "Back to Homepage"}
              </Link>
              {isAdmin && (
                <Link href="/subject/admin/inbox" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-500/10 mt-1">
                  <Inbox size={18} /> {!sidebarCollapsed && <span className="flex-1">Approval Inbox</span>}
                  {!sidebarCollapsed && pendingCount > 0 && <span className="rounded-full bg-amber-500/20 px-2 text-[10px]">{pendingCount}</span>}
                </Link>
              )}
            </div>

            {/* Section: Student Workspace */}
            <div>
              {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase text-[#64748B]">Student Workspace</p>}
              
              <Link href="/continue-studying" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-indigo-500 dark:hover:bg-[#111827]">
                <Clock size={18} /> {!sidebarCollapsed && "Continue Studying"}
              </Link>

              <Link href="/bookmarks" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-amber-500 dark:hover:bg-[#111827] mt-1">
                <Bookmark size={18} /> {!sidebarCollapsed && "Bookmarks"}
              </Link>

              <Link href="/recent-uploads" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-emerald-500 dark:hover:bg-[#111827] mt-1">
                <Upload size={18} /> {!sidebarCollapsed && "Recent Uploads"}
              </Link>
            </div>

            {/* Section: Discovery */}
            {!sidebarCollapsed && trendingDocs.length > 0 && (
              <div>
                <p className="px-3 pb-2 text-[10px] font-bold uppercase text-[#64748B]">Discovery</p>
                <div className="rounded-2xl bg-white p-3 border border-[#E5E7EB] dark:bg-[#111827] dark:border-[#1F2A44] space-y-2.5">
                  <div className="flex items-center gap-2 text-[#4F46E5]"><TrendingUp size={13} /><h3 className="text-[10px] font-extrabold uppercase tracking-wider">Trending Now</h3></div>
                  {trendingDocs.slice(0, 3).map((doc, idx) => (
                    <Link key={`tr-${doc.id}`} href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} className="block text-xs group">
                      <p className="truncate font-bold group-hover:text-[#4F46E5]">{idx + 1}. {doc.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Footer */}
          {!sidebarCollapsed && (
            <div className="mt-auto border-t border-[#E5E7EB] pt-4 px-3 text-[10px] font-medium text-[#94A3B8] space-y-0.5 dark:border-[#1F2A44]">
              <p>Academic Portal • Version 1.6</p>
              <p>© {new Date().getFullYear()} All Rights Reserved.</p>
            </div>
          )}
        </aside>

        {/* ========================================= */}
        {/* 3. INJECTED PAGE CONTENT CONTAINER */}
        {/* ========================================= */}
        <main className="flex-1 w-full min-w-0 p-4 md:p-6 lg:p-8 overflow-x-clip">
          {children}
        </main>
      </div>

      {/* AUTH & UPLOAD MODALS */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2A44]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold">{authMode === "signin" ? "Sign In" : "Sign Up"}</h2>
              <button onClick={() => setShowAuthModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <input required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email Address" className="h-12 w-full rounded-xl border px-4 bg-transparent outline-none focus:border-[#4F46E5] dark:border-[#1F2A44]" />
              <input required type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border px-4 bg-transparent outline-none focus:border-[#4F46E5] dark:border-[#1F2A44]" />
              <button type="submit" disabled={authLoading} className="h-12 w-full rounded-xl bg-[#4F46E5] font-bold text-white hover:bg-[#6366F1]">{authLoading ? "Processing..." : authMode === "signin" ? "Login" : "Create Account"}</button>
              <button type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")} className="w-full text-xs text-[#4F46E5] font-bold hover:underline">
                {authMode === "signin" ? "New student? Create an account" : "Already have an account? Sign In"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showUploadForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2A44]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-extrabold">{isAdmin ? "Admin Database Upload" : "Student Contribution"}</h2>
              <button onClick={() => setShowUploadForm(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#64748B]">Subject</label>
                  <select value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white">
                    {SUBJECTS_LIST.map(sub => <option key={sub} value={sub} className="bg-white dark:bg-[#0B1020]">{sub}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#64748B]">Module</label>
                  <select value={uploadModule} onChange={(e) => setUploadModule(Number(e.target.value))} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white">
                    {[1, 2, 3, 4, 5].map(m => <option key={m} value={m} className="bg-white dark:bg-[#0B1020]">Module {m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-[#64748B]">Document Title</label>
                <input required type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#64748B]">Category</label>
                  <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white">
                    <option value="notes" className="bg-white dark:bg-[#0B1020]">Notes</option>
                    <option value="pyq" className="bg-white dark:bg-[#0B1020]">PYQ</option>
                    <option value="syllabus" className="bg-white dark:bg-[#0B1020]">Syllabus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#64748B]">Uploader</label>
                  <input type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020]" />
                </div>
              </div>
              <input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs py-2" />
              <button type="submit" disabled={uploading} className="h-11 w-full rounded-xl bg-[#4F46E5] text-sm font-bold text-white hover:bg-[#6366F1]">
                {uploading ? "Uploading..." : "Publish Resource"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}