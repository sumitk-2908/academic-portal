"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import AchievementToast from "@/components/ui/AchievementToast";
import { supabase, getTrendingDocuments, uploadDocument, getAchievements, searchDocuments } from "./lib/api";
import ProfileDropdown from "@/components/profile/ProfileDropdown";
import ProfileSidebarCard from "@/components/profile/ProfileSidebarCard";
import { useQuery } from '@tanstack/react-query';
import * as Toast from "@radix-ui/react-toast";
import * as Dialog from "@radix-ui/react-dialog";

import { 
  GraduationCap, Search, Moon, Sun, LogOut, PanelLeft, 
  PanelLeftClose, TrendingUp, X, BookOpen, Bookmark, Clock, 
  Upload, Inbox, Plus, FileText, Home, Menu, Mail, Loader2, 
  User, Settings, Info, Phone, AlertTriangle, Medal, Activity,
  Bell, CheckCheck
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
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
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { data: trendingDocs = [] } = useQuery({
  queryKey: ['trendingDocuments'],
  queryFn: getTrendingDocuments,
  });

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  

  // --- ACHIEVEMENT TOAST STATE ---
  const earnedBadgesRef = useRef<Set<string>>(new Set());
  const [activeToast, setActiveToast] = useState<{title: string, description: string} | null>(null);

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
  const [googleLoading, setGoogleLoading] = useState(false);

  const [globalToast, setGlobalToast] = useState({ open: false, title: "", message: "", type: "default" as "default" | "error" | "success" });

  const showToast = (title: string, message: string, type: "default" | "error" | "success" = "default") => {
    setGlobalToast({ open: true, title, message, type });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      showToast("Sign-In Error", err.message, "error");
      setGoogleLoading(false);
    }
  };

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

  const { count } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  if (count !== null) {
    setPendingCount(count);
  }
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
      const initialBadges = await getAchievements(session.user.id);
      earnedBadgesRef.current = new Set(initialBadges.map((b: any) => b.badge_id));

      // --- NEW: FETCH INITIAL NOTIFICATIONS ---
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }

      refreshSidebarData(session.user.id);
    } else {
      setIsAdmin(false); setIsStudent(false);
      earnedBadgesRef.current.clear();
      refreshSidebarData();
      setNotifications([]);
      setUnreadCount(0);
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
}, []); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => syncUserFromSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserFromSession(session);
    });

    return () => subscription.unsubscribe();
  }, [syncUserFromSession]);

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    let achieveChannel: any;
    let notifChannel: any;
    let notifUpdateChannel: any;

    const setupListeners = async () => {
      // 1. Fetch session FIRST
      const { data: { session } } = await supabase.auth.getSession();
      
      // 2. Stop here if there is no logged-in user
      if (!session?.user) return;
      
      // 3. Achievements Listener
      achieveChannel = supabase
        .channel(`achievements-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            const newBadgeId = payload.new.badge_id;
            
            // If we haven't seen this badge yet during this session
            if (!earnedBadgesRef.current.has(newBadgeId)) {
              earnedBadgesRef.current.add(newBadgeId); // Mark as seen
              
              const badgeLookup: Record<string, {title: string, desc: string}> = {
                "first_upload": { title: "First Contribution", desc: "You uploaded your first resource." },
                "streak_3": { title: "On Fire", desc: "3 day study streak!" },
                "streak_7": { title: "Dedicated Scholar", desc: "7 day study streak!" },
                "power_user": { title: "Power User", desc: "Downloaded 10 documents." },
                "top_contributor": { title: "Top Contributor", desc: "Your uploads reached 50 views." }
              };

              const badgeInfo = badgeLookup[newBadgeId] || { title: "New Badge", desc: "You earned a new achievement!" };
              setActiveToast({ title: badgeInfo.title, description: badgeInfo.desc });
            }
          }
        )
        .subscribe();

      // 4. Notifications Listener (INSERT - New Notifications)
      notifChannel = supabase
        .channel(`notifications-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            setActiveToast({ 
              title: payload.new.title, 
              description: payload.new.message 
            });
          }
        )
        .subscribe();

      // 5. Notifications Listener (UPDATE - Syncing Read States across tabs)
      notifUpdateChannel = supabase
        .channel(`notifications-update-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
          (payload) => {
            setNotifications(prev => {
              const updatedList = prev.map(n => n.id === payload.new.id ? payload.new : n);
              setUnreadCount(updatedList.filter(n => !n.is_read).length);
              return updatedList;
            });
          }
        )
        .subscribe();
    };

    setupListeners();

    // 6. Cleanup channels when component unmounts
    return () => {
      if (achieveChannel) supabase.removeChannel(achieveChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (notifUpdateChannel) supabase.removeChannel(notifUpdateChannel);
    };
  }, []); // Empty dependency array ensures this only runs once

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
        
        showToast("Check Inbox", "Password reset email sent!", "success");
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
          showToast("Registration Complete", "Please verify your email.", "success");
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
      { showToast("Authentication Error", err.message, "error"); }
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
    if (!file) return showToast("Upload Error", "Please map a PDF resource!", "error");

    if (file.size > 52428800) {
      return alert("Upload blocked: File size exceeds the 50MB limit.");
    }

    setUploading(true);
    const formData = new FormData();
    const authorName = uploadedBy || (isAdmin ? "Admin" : "Student");
    
    formData.append("file", file); 
    formData.append('title', uploadTitle); 
    formData.append('uploader_name', authorName);
    formData.append("category", uploadCategory); 
    
    const isModuleDisabled = uploadCategory === "syllabus" || isNonModuleSubject(uploadSubject);
    formData.append("module_id", isModuleDisabled ? "null" : String(uploadModule));
    
    formData.append("uploaded_by", authorName); // Backend will still overwrite this with UUID, which is fine!
    formData.append("subject", uploadSubject); 
    formData.append("status", isAdmin ? "approved" : "pending");

    try {
      await uploadDocument(formData);
      setFile(null); setUploadTitle(""); setShowUploadForm(false);
      const { data: sess } = await supabase.auth.getSession();
      refreshSidebarData(sess?.session?.user?.id);
      if (!isAdmin) showToast("Success", "Notes submitted! Pending admin approval.", "success");
    } catch (err) {
      showToast("Upload Error", "Failed to upload file.", "error");
    } finally {
      setUploading(false);
    }
  };

  const isModuleDisabled = uploadCategory === "syllabus" || isNonModuleSubject(uploadSubject);
  const sendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentUserEmail,
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      showToast("Email Sent", "Verification email sent! Please check your inbox.", "success");
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  useEffect(() => {
  const fetchSearchResults = async () => {
    if (!searchQuery.trim()) {
      setGlobalSearchResults([]);
      return;
    }

    setIsSearching(true);
    // Call the newly created server-side FTS API
    const response = await searchDocuments({ 
      query: searchQuery, 
      limit: 8 
    });
    
    setGlobalSearchResults(response.data);
    setIsSearching(false);
  };

  const debounceTimer = setTimeout(fetchSearchResults, 300); // 300ms delay
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;

    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Update database
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };


  return (
    <StudyHistoryProvider>
     <Toast.Provider swipeDirection="right">
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

                    {isSearching ? (
                      <p className="p-4 text-xs text-center text-[#64748B]">Searching...</p>
                    ) : (
                      <>
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
                        {globalSearchResults.length === 0 && (
                          <p className="p-4 text-xs text-center text-[#64748B]">No matching documents found.</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44]">
                {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : null}
              </button>
              
              {/* --- NEW NOTIFICATION BELL --- */}
              {(isAdmin || isStudent) && (
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] dark:border-[#1F2A44] hover:bg-gray-50 dark:hover:bg-[#1F2A44] transition-colors"
                  >
                    <Bell size={18} className="text-[#64748B] dark:text-[#94A3B8]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#111827]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* NOTIFICATION DROPDOWN */}
                  {showNotifications && (
                    <>
                      {/* Invisible backdrop to catch outside clicks */}
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                      
                      <div className="absolute -right-2 sm:right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-2rem)] sm:w-80 rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827] animate-in slide-in-from-top-2">
                        <div className="flex items-center justify-between border-b border-[#E5E7EB] p-3 dark:border-[#1F2A44]">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Notifications</p>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              {unreadCount} New
                            </span>
                          )}
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                          {notifications.length === 0 ? (
                            <p className="p-4 text-center text-xs text-[#64748B]">You're all caught up!</p>
                          ) : (
                            notifications.map(notif => (
                              <div 
                                key={notif.id}
                                onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
                                className={`flex cursor-pointer flex-col gap-1 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-[#1F2A44] ${!notif.is_read ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                              >
                                <div className="flex justify-between items-start">
                                  <p className={`text-xs ${!notif.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-300'}`}>
                                    {notif.title}
                                  </p>
                                  {!notif.is_read ? (
                                    <span className="h-2 w-2 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                                  ) : (
                                    <CheckCheck size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                  )}
                                </div>
                                <p className="text-[11px] leading-tight text-[#64748B] dark:text-[#94A3B8]">
                                  {notif.message}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {(isAdmin || isStudent) ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowUploadForm(true)} className="flex h-9 items-center gap-2 rounded-xl bg-[#4F46E5] px-4 text-xs font-bold text-white hover:bg-[#6366F1]">
                    <Plus size={14} /> <span className="hidden sm:inline">{isAdmin ? "Upload" : "Contribute"}</span>
                  </button>
                  <div className="hidden sm:block">
                    <ProfileDropdown 
                      userName={uploadedBy || (isAdmin ? "Admin" : "Student")} 
                      userEmail={currentUserEmail} 
                      onLogout={handleLogout} 
                    />
                  </div>
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
          <aside 
            aria-label="Main Desktop Navigation"
            className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col overflow-y-auto border-r border-[#E5E7EB] bg-[#FAFAF9]/50 py-6 transition-all duration-200 dark:border-[#1F2A44] dark:bg-[#0B1020]/50 lg:flex ${sidebarCollapsed ? 'w-16 px-2' : 'w-[220px] px-4'}`}>
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
                    {trendingDocs.slice(0, 5).map((doc, idx) => (
                      <Link key={`tr-${doc.id}`} href={`/subject/${doc.subject.toLowerCase().replace(/ /g, '-')}/module-${doc.module_id || 1}/${doc.id}`} className="block text-xs group">
                        <p className="truncate font-bold group-hover:text-[#4F46E5]">{idx + 1}. {doc.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <div className="mt-auto flex flex-col pt-4">
                {(isAdmin || isStudent) && (
                  <ProfileSidebarCard 
                    userName={uploadedBy || (isAdmin ? "Admin" : "Student")} 
                    role={isAdmin ? "Administrator" : "1st year · CSE"} 
                  />
                )}
                <div className="space-y-0.5 border-t border-[#E5E7EB] mt-3 px-3 pt-4 text-[10px] font-medium text-[#94A3B8] dark:border-[#1F2A44]">
                  <p>Academic Portal • Version 1.6</p>
                  <p>© {new Date().getFullYear()} All Rights Reserved.</p>
                </div>
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
        <nav 
          aria-label="Mobile Navigation"
          className="fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-center justify-around border-t border-[#E5E7EB] bg-[#FFFFFF]/90 backdrop-blur-xl pb-safe dark:border-[#1F2A44] dark:bg-[#111827]/90 lg:hidden">
          <Link 
            href="/" 
            onClick={() => setShowMobileMenu(false)} 
            className={`flex min-w-[64px] flex-col items-center gap-1 ${pathname === '/' ? 'text-[#4F46E5]' : 'text-[#64748B] dark:text-[#94A3B8]'}`}
          >
            <Home size={22} />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          
          {/* CHANGED: Replaced Continue with Profile */}
          <Link 
            href="/profile" 
            onClick={() => setShowMobileMenu(false)} 
            className={`flex min-w-[64px] flex-col items-center gap-1 ${pathname === '/profile' ? 'text-indigo-500' : 'text-[#64748B] dark:text-[#94A3B8]'}`}
          >
            <User size={22} />
            <span className="text-[10px] font-bold">Profile</span>
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[#E5E7EB] bg-white p-6 pb-28 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 id="mobile-menu-title" className="text-xl font-extrabold text-[#111827] dark:text-white">More Options</h2>
                <button aria-label="Close menu" onClick={() => setShowMobileMenu(false)} className="rounded-full bg-gray-100 p-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              
              <div className="space-y-6">
                
                {/* 1. Quick Links Grid */}
                <div className="space-y-3">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Quick Links</p>
                  
                  {/* Grid for standard links */}
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/recent-uploads" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 text-xs font-bold text-[#111827] dark:bg-[#1F2A44] dark:text-white">
                      <Upload size={18} className="text-emerald-500" /> Uploads
                    </Link>
                    <Link href="/continue-studying" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 text-xs font-bold text-[#111827] dark:bg-[#1F2A44] dark:text-white">
                      <Clock size={18} className="text-[#4F46E5]" /> Continue
                    </Link>
                    <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 text-xs font-bold text-[#111827] dark:bg-[#1F2A44] dark:text-white">
                      <Medal size={18} className="text-amber-500" /> Badges
                    </Link>
                    <Link href="/profile" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 text-xs font-bold text-[#111827] dark:bg-[#1F2A44] dark:text-white">
                      <Activity size={18} className="text-blue-500" /> Activity
                    </Link>
                  </div>

                  {/* --- NEW: MOBILE NOTIFICATION LINK --- */}
                  <button 
                    onClick={() => {
                      setShowMobileMenu(false);
                      setShowNotifications(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top where the bell is
                    }} 
                    className="mt-3 flex w-full items-center justify-between rounded-2xl bg-indigo-50 p-3.5 text-xs font-bold text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-indigo-500" /> Notifications
                    </div>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                        {unreadCount} New
                      </span>
                    )}
                  </button>
                </div>

                {/* 2. App & Support */}
                <div className="space-y-2">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">App & Support</p>
                  <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#111827] hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                    <Settings size={18} className="text-[#64748B]" /> Settings
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#111827] hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                    <Info size={18} className="text-[#64748B]" /> About Portal
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#111827] hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                    <Phone size={18} className="text-[#64748B]" /> Contact Us
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold text-[#111827] hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800">
                    <AlertTriangle size={18} className="text-[#64748B]" /> Report Issue
                  </button>
                </div>
                
                {/* 3. Admin Controls (Kept intact) */}
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

                {/* 4. Sign Out (Kept intact) */}
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

        
        {/* AUTH MODAL - ACCESSIBILITY UPGRADED */}
        <Dialog.Root open={showAuthModal} onOpenChange={setShowAuthModal}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content 
              aria-describedby="auth-modal-description"
              className="fixed left-[50%] top-[50%] z-[100] w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            >
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-xl font-extrabold">
                  {authMode === "signin" ? "Sign In" : authMode === "signup" ? "Sign Up" : "Reset Password"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button aria-label="Close authentication window" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={20} aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </div>
              
              <Dialog.Description id="auth-modal-description" className="sr-only">
                Authenticate to your student account or create a new one to access the academic portal.
              </Dialog.Description>

              {authMode !== "forgot" && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading || authLoading}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-white font-bold text-[#0F172A] transition-all hover:bg-gray-50 hover:shadow-sm dark:border-[#1F2A44] dark:bg-[#111827] dark:text-white dark:hover:bg-[#1A2332]"
                  >
                    {googleLoading ? <Loader2 className="animate-spin text-[#64748B]" size={20} /> : <><FcGoogle size={24} /> Continue with Google</>}
                  </button>

                  <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-[#E5E7EB] dark:border-[#1F2A44]"></div>
                    <span className="mx-4 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">Or use email</span>
                    <div className="flex-grow border-t border-[#E5E7EB] dark:border-[#1F2A44]"></div>
                  </div>
                </>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label htmlFor="authEmailInput" className="sr-only">Email Address</label>
                  <input id="authEmailInput" required type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email Address" className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-sm outline-none focus:border-[#4F46E5] dark:border-[#1F2A44] dark:text-white" />
                </div>
                
                {authMode !== "forgot" && (
                  <div>
                    <label htmlFor="authPasswordInput" className="sr-only">Password</label>
                    <input id="authPasswordInput" required type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-sm outline-none focus:border-[#4F46E5] dark:border-[#1F2A44] dark:text-white" />
                  </div>
                )}
                
                <button type="submit" disabled={authLoading || googleLoading} className="h-12 w-full rounded-xl bg-[#4F46E5] font-bold text-white hover:bg-[#6366F1]">
                  {authLoading ? <Loader2 className="mx-auto animate-spin" size={18} /> : authMode === "signin" ? "Login" : authMode === "signup" ? "Create Account" : "Send Reset Link"}
                </button>

                {/* Dynamic Navigation Links */}
                {authMode === "signin" && (
                  <div className="flex justify-between w-full mt-2 text-[11px] font-bold text-[#4F46E5]">
                    <button type="button" onClick={() => setAuthMode("forgot")} className="hover:underline">Forgot Password?</button>
                    <button type="button" onClick={() => setAuthMode("signup")} className="hover:underline">New student? Sign Up</button>
                  </div>
                )}
                {authMode === "signup" && (
                  <button type="button" onClick={() => setAuthMode("signin")} className="w-full mt-2 text-[11px] font-bold text-[#4F46E5] hover:underline">Already have an account? Sign In</button>
                )}
                {authMode === "forgot" && (
                  <button type="button" onClick={() => setAuthMode("signin")} className="w-full mt-2 text-[11px] font-bold text-[#4F46E5] hover:underline">Back to Sign In</button>
                )}
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* UPLOAD MODAL - ACCESSIBILITY UPGRADED */}
        <Dialog.Root open={showUploadForm} onOpenChange={setShowUploadForm}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content 
              aria-describedby="upload-modal-description"
              className="fixed left-[50%] top-[50%] z-[100] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            >
              <div className="flex items-center justify-between mb-6">
                <Dialog.Title className="text-lg font-extrabold">
                  {isAdmin ? "Admin Database Upload" : "Student Contribution"}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button aria-label="Close upload window" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={20} aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </div>
              
              <Dialog.Description id="upload-modal-description" className="sr-only">
                Fill out the metadata and select a PDF file to contribute to the academic portal repository.
              </Dialog.Description>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="uploadSubject" className="block mb-1 text-[10px] font-bold uppercase text-[#64748B]">Subject</label>
                    <select id="uploadSubject" value={uploadSubject} onChange={(e) => setUploadSubject(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white">
                      {SUBJECTS_LIST.map(sub => <option key={sub} value={sub} className="bg-white dark:bg-[#0B1020]">{sub}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="uploadModule" className="block mb-1 text-[10px] font-bold uppercase text-[#64748B]">Module</label>
                    <select 
                      id="uploadModule"
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
                  <label htmlFor="uploadTitle" className="block mb-1 text-[10px] font-bold uppercase text-[#64748B]">Document Title</label>
                  <input id="uploadTitle" required type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="uploadCategory" className="block mb-1 text-[10px] font-bold uppercase text-[#64748B]">Category</label>
                    <select id="uploadCategory" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white">
                      <option value="notes" className="bg-white dark:bg-[#0B1020]">Notes</option>
                      <option value="pyq" className="bg-white dark:bg-[#0B1020]">PYQ</option>
                      <option value="syllabus" className="bg-white dark:bg-[#0B1020]">Syllabus</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="uploadedBy" className="block mb-1 text-[10px] font-bold uppercase text-[#64748B]">Uploader</label>
                    <input id="uploadedBy" type="text" value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAF9] px-3 text-xs outline-none dark:border-[#1F2A44] dark:bg-[#0B1020] dark:text-white" />
                  </div>
                </div>
                <div>
                  <label htmlFor="uploadFileInput" className="sr-only">Select PDF File</label>
                  <input id="uploadFileInput" required type="file" accept="application/pdf" onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
                      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
                        alert("File size exceeds the 50MB limit. Please compress your PDF and try again.");
                        e.target.value = '';
                        setFile(null);
                        return;
                      }
                      setFile(selectedFile);
                    } else {
                      setFile(null);
                    }
                  }} className="w-full py-2 text-xs" />
                </div>
                <button type="submit" disabled={uploading} className="h-11 w-full rounded-xl bg-[#4F46E5] text-sm font-bold text-white hover:bg-[#6366F1]">
                  {uploading ? "Uploading..." : "Publish Resource"}
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        
        {/* ========================================= */}
        {/* GLOBAL ACHIEVEMENT TOAST */}
        {/* ========================================= */}
        {activeToast && (
          <AchievementToast 
            title={activeToast.title}
            description={activeToast.description}
            onClose={() => setActiveToast(null)}
          />
        )}
      </div>
      {/* GLOBAL RADIX TOAST */}
      <Toast.Root 
        open={globalToast.open} 
        onOpenChange={(open) => setGlobalToast(prev => ({...prev, open}))} 
        className={`fixed z-[150] bottom-4 right-4 w-auto max-w-md rounded-xl p-4 shadow-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${globalToast.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50' : globalToast.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}
      >
        <Toast.Title className={`text-sm font-bold ${globalToast.type === 'error' ? 'text-red-700 dark:text-red-400' : globalToast.type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
          {globalToast.title}
        </Toast.Title>
        <Toast.Description className={`mt-1 text-xs ${globalToast.type === 'error' ? 'text-red-600 dark:text-red-300' : globalToast.type === 'success' ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
          {globalToast.message}
        </Toast.Description>
      </Toast.Root>
      <Toast.Viewport className="fixed bottom-0 right-0 z-[150] p-6 w-full md:max-w-[400px] outline-none flex flex-col gap-2" />
    </Toast.Provider>
   </StudyHistoryProvider>
  );
}