"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, getTrendingDocuments, uploadDocument, getStudentBookmarks, getRecentStudyActivity } from "./lib/api";
import { 
  GraduationCap, Search, Moon, Sun, LogOut, PanelLeft, 
  PanelLeftClose, TrendingUp, X, BookOpen, Bookmark, Clock, 
  Upload, Inbox, Plus, FileText, Home, Menu, Mail
} from "lucide-react";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { StudyHistoryProvider } from "@/app/context/StudyHistoryContext";

const SUBJECTS_LIST = [
  "MATHS 1", "MATHS 2", "PHYSICS", "BEE", "PPS", "BIOLOGY", "WORKSHOP",
  "PHYSICS LAB", "COMMUNICATION SKILLS", "CHEMISTRY", "BME", "BE",
  "ENVIRONMENTAL SCIENCE", "BE LAB", "BEE LAB", "CHEMISTRY LAB", "NSS",
  "ENGINEERING GRAPHICS"
];

// Helper to determine if a subject should have its module selection disabled
const isNonModuleSubject = (subjectName: string) => {
  const nonModules = ["WORKSHOP", "ENGINEERING GRAPHICS", "COMMUNICATION SKILLS", "NSS"];
  return nonModules.includes(subjectName) || subjectName.endsWith("LAB");
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  
  const router = useRouter();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Global Data States
  const [searchQuery, setSearchQuery] = useState("");
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [trendingDocs, setTrendingDocs] = useState<any[]>([]);
  const [recentStudy, setRecentStudy] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Auth States
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(true); 
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">("signin");
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
      setEmailConfirmed(!!session.user.email_confirmed_at);
      setCurrentUserEmail(session.user.email || "");
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      
      const isDbAdmin = roleData?.role === 'admin';
      const isPortalAdminFlow = sessionStorage.getItem("admin_portal_auth") === "true";

      if (isDbAdmin && isPortalAdminFlow) {
        setIsAdmin(true); setIsStudent(false);
      } else {
        setIsAdmin(false); setIsStudent(true);
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
    sessionStorage.removeItem("admin_portal_auth");

    try {

      if (authMode === "forgot") {
        // --- NEW: FORGOT PASSWORD LOGIC ---
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        
        alert("Password reset email sent! Please check your inbox.");
        setAuthMode("signin");
        setShowAuthModal(false);

      }else if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ 
          email: authEmail, 
          password: authPassword,
          options: { emailRedirectTo: window.location.origin }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("admin_portal_auth");
    
    // Prevent cross-user data merging on shared computers
    localStorage.removeItem("portal_bookmarks");
    localStorage.removeItem("portal_study_history");
    
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
    formData.append("category", uploadCategory); 
    
    const isModuleDisabled = uploadCategory === "syllabus" || isNonModuleSubject(uploadSubject);
    formData.append("module_id", isModuleDisabled ? "null" : String(uploadModule));
    
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

  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    return allDocs.filter(doc => {
      if (doc.status !== 'approved') return false;

      const searchableText = [
        doc.title,
        doc.subject,
        doc.category,
        doc.module_id ? `module ${doc.module_id}` : ''
      ].join(' ').toLowerCase();

      return queryTerms.every(term => searchableText.includes(term));
    }).slice(0, 8);
  }, [searchQuery, allDocs]);

  const pendingCount = allDocs.filter(d => d.status === 'pending').length;
  const recentUploads = allDocs.filter(d => d.status === 'approved').slice(0, 5);

  const isModuleDisabled = uploadCategory === "syllabus" || isNonModuleSubject(uploadSubject);
  const sendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentUserEmail,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      alert("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <StudyHistoryProvider>
      <div className="flex min-h-[100dvh] flex-col transition-colors duration-300">

        {isStudent && !emailConfirmed && (
          <div className="z-50 flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-500">
            <Mail size={14} />
            <span>Please verify your email address to unlock upload privileges and study notifications.</span>
            <button onClick={sendVerificationEmail} className="ml-2 font-bold underline hover:text-amber-800 dark:hover:text-amber-400">
              Send Link
            </button>
          </div>
        )}
        
        {/* ========================================= */}
        {/* 1. THE ONLY GLOBAL HEADER */}
        {/* ========================================= */}
        <header className="sticky top-0 z-40 border-b border-[#E5E7EB] dark:border-[#1F2A44] bg-[#FFFFFF]/90 dark:bg-[#111827]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-4 px-4 md:px-6">
            
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

            <div className="flex flex-1 justify-center min-w-0 relative group">
              <div className="w-full max-w-2xl relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 dark:text-[#94A3B8]" size={18} />
                {/* --- FIXED DARK MODE FOCUS BACKGROUND --- */}
                <input
                  type="text"
                  placeholder="Search globally for PDFs, subjects, modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-gray-200 bg-gray-100 pl-11 pr-10 text-sm outline-none transition-colors focus:border-indigo-400 focus:bg-white dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white dark:focus:bg-[#111827]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]">
                    <X size={14} />
                  </button>
                )}

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
                          <p className="text-[10px] text-[#64748B] uppercase">{doc.subject} • Module {doc.module_id || "N/A"} • {doc.category}</p>
                        </div>
                      </Link>
                    ))}
                    {globalSearchResults.length === 0 && <p className="p-4 text-xs text-center text-[#64748B]">No matching documents found.</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44]">
                {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : null}
              </button>
              
              {(isAdmin || isStudent) ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowUploadForm(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white hover:bg-[#6366F1]">
                    <Plus size={14} /> <span className="hidden sm:inline">{isAdmin ? "Upload" : "Contribute"}</span>
                  </button>
                  <button onClick={handleLogout} className="hidden sm:flex h-9 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm text-[#64748B] hover:bg-red-50 hover:text-red-500 dark:border-[#1F2A44]">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAuthModal(true)} className="flex h-9 items-center rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#6366F1]">
                  Sign In <span className="hidden sm:inline">&nbsp;/ Sign Up</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1600px] flex-1">
          
          {/* ========================================= */}
          {/* 2. THE ONLY OMNIPRESENT SIDEBAR (DESKTOP) */}
          {/* ========================================= */}
          <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-[#E5E7EB] bg-[#FAFAF9]/50 py-6 transition-all duration-200 dark:border-[#1F2A44] dark:bg-[#0B1020]/50 lg:flex ${sidebarCollapsed ? 'w-16 px-2' : 'w-[220px] px-4'}`}>
            <div className="space-y-6 flex-1">
              
              <div>
                {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase text-[#64748B]">Navigation</p>}
                <Link href="/" title={sidebarCollapsed ? "Back to Homepage" : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-[#4F46E5] dark:hover:bg-[#111827]">
                  <Home size={18} /> {!sidebarCollapsed && "Back to Homepage"}
                </Link>
                {isAdmin && (
                  <Link href="/subject/admin/inbox" title={sidebarCollapsed ? "Approval Inbox" : undefined} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-500/10">
                    <Inbox size={18} /> {!sidebarCollapsed && <span className="flex-1">Approval Inbox</span>}
                    {!sidebarCollapsed && pendingCount > 0 && <span className="rounded-full bg-amber-500/20 px-2 text-[10px]">{pendingCount}</span>}
                  </Link>
                )}
              </div>

              <div>
                {!sidebarCollapsed && <p className="px-3 pb-2 text-[10px] font-bold uppercase text-[#64748B]">Student Workspace</p>}
                
                <Link href="/continue-studying" title={sidebarCollapsed ? "Continue Studying" : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-indigo-500 dark:hover:bg-[#111827]">
                  <Clock size={18} /> {!sidebarCollapsed && "Continue Studying"}
                </Link>

                <Link href="/bookmarks" title={sidebarCollapsed ? "Bookmarks" : undefined} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-amber-500 dark:hover:bg-[#111827]">
                  <Bookmark size={18} /> {!sidebarCollapsed && "Bookmarks"}
                </Link>

                <Link href="/recent-uploads" title={sidebarCollapsed ? "Recent Uploads" : undefined} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#64748B] hover:bg-white hover:text-emerald-500 dark:hover:bg-[#111827]">
                  <Upload size={18} /> {!sidebarCollapsed && "Recent Uploads"}
                </Link>
              </div>

              {!sidebarCollapsed && trendingDocs.length > 0 && (
                <div>
                  <p className="px-3 pb-2 text-[10px] font-bold uppercase text-[#64748B]">Discovery</p>
                  <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3 space-y-2.5 dark:border-[#1F2A44] dark:bg-[#111827]">
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

            {!sidebarCollapsed && (
              <div className="mt-auto space-y-0.5 border-t border-[#E5E7EB] px-3 pt-4 text-[10px] font-medium text-[#94A3B8] dark:border-[#1F2A44]">
                <p>Academic Portal • Version 1.6</p>
                <p>© {new Date().getFullYear()} All Rights Reserved.</p>
              </div>
            )}
          </aside>

          {/* ========================================= */}
          {/* 3. INJECTED PAGE CONTENT CONTAINER */}
          {/* ========================================= */}
          <main className="flex-1 w-full min-w-0 p-4 md:p-6 lg:p-8 overflow-x-clip pb-24 lg:pb-8">
            {children}
          </main>
        </div>

        {/* ========================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR */}
        {/* ========================================= */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-center justify-around border-t border-[#E5E7EB] bg-[#FFFFFF]/90 backdrop-blur-xl pb-safe dark:border-[#1F2A44] dark:bg-[#111827]/90 lg:hidden">
          <Link 
            href="/" 
            onClick={() => setShowMobileMenu(false)} 
            className={`flex min-w-[64px] flex-col items-center gap-1 ${pathname === '/' ? 'text-[#4F46E5]' : 'text-[#64748B] dark:text-[#94A3B8]'}`}
          >
            <Home size={22} />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link 
            href="/continue-studying" 
            onClick={() => setShowMobileMenu(false)} 
            className={`flex min-w-[64px] flex-col items-center gap-1 ${pathname === '/continue-studying' ? 'text-indigo-500' : 'text-[#64748B] dark:text-[#94A3B8]'}`}
          >
            <Clock size={22} />
            <span className="text-[10px] font-bold">Continue</span>
          </Link>
          <Link 
            href="/bookmarks" 
            onClick={() => setShowMobileMenu(false)} 
            className={`flex min-w-[64px] flex-col items-center gap-1 ${pathname === '/bookmarks' ? 'text-amber-500' : 'text-[#64748B] dark:text-[#94A3B8]'}`}
          >
            <Bookmark size={22} />
            <span className="text-[10px] font-bold">Bookmarks</span>
          </Link>
          <button 
            onClick={() => setShowMobileMenu(true)} 
            className={`flex min-w-[64px] flex-col items-center gap-1 ${showMobileMenu ? 'text-[#4F46E5]' : 'text-[#64748B] dark:text-[#94A3B8]'}`}
          >
            <Menu size={22} />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </nav>

        {/* ========================================= */}
        {/* MOBILE MORE MENU DRAWER */}
        {/* ========================================= */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileMenu(false)}>
            <div 
              className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[#E5E7EB] bg-white p-6 pb-28 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-[#111827] dark:text-white">More Options</h2>
                <button onClick={() => setShowMobileMenu(false)} className="rounded-full bg-gray-100 p-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <X size={20}/>
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase text-[#64748B]">Discovery & Uploads</p>
                  <Link 
                    href="/recent-uploads" 
                    onClick={() => setShowMobileMenu(false)} 
                    className="flex items-center gap-3 rounded-xl border border-transparent p-3 text-sm font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#1F2A44] dark:text-white dark:hover:bg-gray-800"
                  >
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"><Upload size={18} /></div>
                    Recent Uploads
                  </Link>
                </div>

                {trendingDocs.length > 0 && (
                  <div className="space-y-2">
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase text-[#64748B]">Trending Now</p>
                    <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAF9] p-4 space-y-3 dark:border-[#1F2A44] dark:bg-[#0B1020]">
                      <div className="flex items-center gap-2 text-[#4F46E5]">
                        <TrendingUp size={16} />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider">Top Documents</h3>
                      </div>
                      {trendingDocs.slice(0, 5).map((doc, idx) => (
                        <Link 
                          key={`mob-tr-${doc.id}`} 
                          href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} 
                          onClick={() => setShowMobileMenu(false)}
                          className="block text-sm group"
                        >
                          <p className="truncate font-semibold text-[#111827] group-hover:text-[#4F46E5] dark:text-white">{idx + 1}. {doc.title}</p>
                          <p className="mt-0.5 text-[10px] text-[#64748B]">{doc.subject} • {doc.category}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {isAdmin && (
                  <div className="space-y-2">
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase text-[#64748B]">Admin Controls</p>
                    <Link 
                      href="/subject/admin/inbox" 
                      onClick={() => setShowMobileMenu(false)} 
                      className="flex items-center gap-3 rounded-xl border border-transparent p-3 text-sm font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#1F2A44] dark:text-white dark:hover:bg-gray-800"
                    >
                      <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500"><Inbox size={18} /></div>
                      Approval Inbox
                      {pendingCount > 0 && (
                        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-600">{pendingCount} pending</span>
                      )}
                    </Link>
                  </div>
                )}

                {(isAdmin || isStudent) && (
                  <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                    <button 
                      onClick={() => { setShowMobileMenu(false); handleLogout(); }} 
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 p-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AUTH & UPLOAD MODALS */}
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold">
                {authMode === "signin" ? "Sign In" : authMode === "signup" ? "Sign Up" : "Reset Password"}
              </h2>
              <button onClick={() => setShowAuthModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <input required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email Address" className="h-12 w-full rounded-xl border bg-transparent px-4 outline-none focus:border-[#4F46E5] dark:border-[#1F2A44]" />
              
              {/* Hide password input if they are just requesting a reset link */}
              {authMode !== "forgot" && (
                <input required type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border bg-transparent px-4 outline-none focus:border-[#4F46E5] dark:border-[#1F2A44]" />
              )}
              
              <button type="submit" disabled={authLoading} className="h-12 w-full rounded-xl bg-[#4F46E5] font-bold text-white hover:bg-[#6366F1]">
                {authLoading ? "Processing..." : authMode === "signin" ? "Login" : authMode === "signup" ? "Create Account" : "Send Reset Link"}
              </button>

              {/* Dynamic Navigation Links */}
              {authMode === "signin" && (
                  <div className="flex justify-between w-full text-xs font-bold text-[#4F46E5]">
                    <button type="button" onClick={() => setAuthMode("forgot")} className="hover:underline">Forgot Password?</button>
                    <button type="button" onClick={() => setAuthMode("signup")} className="hover:underline">New student? Sign Up</button>
                  </div>
                )}
                {authMode === "signup" && (
                  <button type="button" onClick={() => setAuthMode("signin")} className="w-full text-xs font-bold text-[#4F46E5] hover:underline">Already have an account? Sign In</button>
                )}
                {authMode === "forgot" && (
                  <button type="button" onClick={() => setAuthMode("signin")} className="w-full text-xs font-bold text-[#4F46E5] hover:underline">Back to Sign In</button>
                )}
              </form>
            </div>
          </div>
        )}

        {showUploadForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]">
              <div className="flex items-center justify-between mb-6">
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
                    <select 
                      value={uploadModule} 
                      onChange={(e) => setUploadModule(Number(e.target.value))} 
                      disabled={isModuleDisabled}
                      className={`h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white ${isModuleDisabled ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500' : ''}`}
                    >
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
                <input required type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full py-2 text-xs" />
                <button type="submit" disabled={uploading} className="h-11 w-full rounded-xl bg-[#4F46E5] text-sm font-bold text-white hover:bg-[#6366F1]">
                  {uploading ? "Uploading..." : "Publish Resource"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </StudyHistoryProvider>
  );
}