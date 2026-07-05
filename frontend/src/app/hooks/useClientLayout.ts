import { useCallback, useEffect, useState, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, getTrendingDocuments, uploadDocument, getAchievements, searchDocuments, UploadState } from "@/app/lib/api";
import type { AuthPromptFeature } from "@/app/lib/auth-prompts";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';

export const SUBJECTS_LIST = [
  "MATHS 1", "MATHS 2", "PHYSICS", "BEE", "PPS", "BIOLOGY", "WORKSHOP",
  "PHYSICS LAB", "COMMUNICATION SKILLS", "CHEMISTRY", "BME", "BE",
  "ENVIRONMENTAL SCIENCE", "BE LAB", "BEE LAB", "CHEMISTRY LAB", "NSS",
  "ENGINEERING GRAPHICS"
];

export const isNonModuleSubject = (subjectName: string) => {
  const nonModules = ["WORKSHOP", "ENGINEERING GRAPHICS", "COMMUNICATION SKILLS", "NSS"];
  return nonModules.includes(subjectName) || subjectName.endsWith("LAB");
};

export function useClientLayout() {
  const router = useRouter();
  const pathname = usePathname();
  
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  
  const { data: trendingDocs = [] } = useQuery({
    queryKey: ['trendingDocuments'],
    queryFn: getTrendingDocuments,
    placeholderData: keepPreviousData,
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const earnedBadgesRef = useRef<Set<string>>(new Set());
  const [activeToast, setActiveToast] = useState<{title: string, description: string} | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(true); 
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptContext, setAuthPromptContext] = useState<AuthPromptFeature | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [globalToast, setGlobalToast] = useState({ open: false, title: "", message: "", type: "default" as "default" | "error" | "success" });

  const showToast = (title: string, message: string, type: "default" | "error" | "success" = "default") => {
    setGlobalToast({ open: true, title, message, type });
  };

  const openAuthPrompt = useCallback((feature: AuthPromptFeature) => {
    setAuthPromptContext(feature);
    setAuthMode("signin");
    setShowAuthModal(true);
  }, []);

  const handleAuthModalOpenChange = useCallback((open: boolean) => {
    setShowAuthModal(open);
    if (!open) setAuthPromptContext(null);
  }, []);

  const [isOffline, setIsOffline] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("notes");
  const [uploadedBy, setUploadedBy] = useState("");
  const [uploadSubject, setUploadSubject] = useState("MATHS 1");
  const [uploadModule, setUploadModule] = useState(1);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrorMsg, setUploadErrorMsg] = useState("");

  const refreshSidebarData = useCallback(async (currentUserId?: string) => {
    const { count } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
      
    if (count !== null) setPendingCount(count);
  }, []);

  const syncUserFromSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
      setEmailConfirmed(!!session.user.email_confirmed_at);
      setCurrentUserEmail(session.user.email || "");
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
      const isDbAdmin = roleData?.role === 'admin';
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const isPortalAdminFlow = aalData?.currentLevel === 'aal2';

      if (isDbAdmin && isPortalAdminFlow) {
        setIsAdmin(true); setIsStudent(false);
      } else {
        setIsAdmin(false); setIsStudent(true);
        setUploadedBy(session.user.email?.split('@')[0] || "Student");
      }
      const initialBadges = await getAchievements(session.user.id);
      earnedBadgesRef.current = new Set(initialBadges.map((b: any) => b.badge_id));

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
    const handleAuthPrompt = (event: Event) => {
      const feature = (event as CustomEvent<AuthPromptFeature>).detail;
      if (feature) openAuthPrompt(feature);
    };

    window.addEventListener("portal_auth_prompt", handleAuthPrompt);
    return () => window.removeEventListener("portal_auth_prompt", handleAuthPrompt);
  }, [openAuthPrompt]);

  useEffect(() => {
    const handlePortalToast = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) showToast(detail.title, detail.message, detail.type);
    };

    window.addEventListener("portal_toast", handlePortalToast);
    return () => window.removeEventListener("portal_toast", handlePortalToast);
  }, []);

  useEffect(() => {
    const handleUploadPrompt = () => {
      if (isAdmin || isStudent) setShowUploadForm(true);
      else openAuthPrompt("upload");
    };

    window.addEventListener("portal_upload_prompt", handleUploadPrompt);
    return () => window.removeEventListener("portal_upload_prompt", handleUploadPrompt);
  }, [isAdmin, isStudent, openAuthPrompt]);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => syncUserFromSession(session))
      .finally(() => setSidebarLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => syncUserFromSession(session));
    return () => subscription.unsubscribe();
  }, [syncUserFromSession]);

  useEffect(() => {
    let achieveChannel: any;
    let notifChannel: any;
    let notifUpdateChannel: any;

    const setupListeners = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      achieveChannel = supabase
        .channel(`achievements-${session.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${session.user.id}` }, (payload) => {
            const newBadgeId = payload.new.badge_id;
            if (!earnedBadgesRef.current.has(newBadgeId)) {
              earnedBadgesRef.current.add(newBadgeId); 
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
          })
        .subscribe();

      notifChannel = supabase
        .channel(`notifications-${session.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            setActiveToast({ title: payload.new.title, description: payload.new.message });
          })
        .subscribe();

      notifUpdateChannel = supabase
        .channel(`notifications-update-${session.user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
            setNotifications(prev => {
              const updatedList = prev.map(n => n.id === payload.new.id ? payload.new : n);
              setUnreadCount(updatedList.filter(n => !n.is_read).length);
              return updatedList;
            });
          })
        .subscribe();
    };

    setupListeners();
    return () => {
      if (achieveChannel) supabase.removeChannel(achieveChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (notifUpdateChannel) supabase.removeChannel(notifUpdateChannel);
    };
  }, []); 

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark"); localStorage.setItem("theme", "light"); setIsDarkMode(false);
    } else {
      html.classList.add("dark"); localStorage.setItem("theme", "dark"); setIsDarkMode(true);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/`, queryParams: { access_type: 'offline', prompt: 'consent' } } });
      if (error) throw error;
    } catch (err: any) {
      showToast("Sign-In Error", err.message, "error");
      setGoogleLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    sessionStorage.removeItem("admin_portal_auth");

    try {
      if (authMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        showToast("Check Inbox", "Password reset email sent!", "success");
        setAuthMode("signin");
        handleAuthModalOpenChange(false);
      } else if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) { await syncUserFromSession(data.session); setAuthPassword(""); handleAuthModalOpenChange(false); }
        else { showToast("Registration Complete", "Please verify your email.", "success"); setAuthMode("signin"); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        await syncUserFromSession(data.session);
        setAuthPassword("");
        handleAuthModalOpenChange(false);
      }
    } catch (err: any) { showToast("Authentication Error", err.message, "error"); } 
    finally { setAuthLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("admin_portal_auth");
    localStorage.removeItem("portal_bookmarks");
    localStorage.removeItem("portal_study_history");
    setIsAdmin(false); setIsStudent(false);
    router.push('/');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return showToast("Upload Error", "Please map a PDF resource!", "error");
    if (file.size > 52428800) return alert("Upload blocked: File size exceeds the 50MB limit.");

    setUploadState("idle"); setUploadProgress(0); setUploadErrorMsg(""); setUploading(true);

    const formData = new FormData();
    const authorName = uploadedBy || (isAdmin ? "Admin" : "Student");
    formData.append("file", file); formData.append('title', uploadTitle); formData.append('uploader_name', authorName); formData.append("category", uploadCategory); 
    const isModuleDisabled = uploadCategory === "syllabus" || isNonModuleSubject(uploadSubject);
    formData.append("module_id", isModuleDisabled ? "null" : String(uploadModule));
    formData.append("uploaded_by", authorName); formData.append("subject", uploadSubject); formData.append("status", isAdmin ? "approved" : "pending");

    try {
      await uploadDocument(formData, (percent) => setUploadProgress(percent), (state) => setUploadState(state));
      setTimeout(async () => {
        setFile(null); setUploadTitle(""); setShowUploadForm(false); setUploadState("idle"); setUploading(false);
        const { data: sess } = await supabase.auth.getSession();
        refreshSidebarData(sess?.session?.user?.id);
        if (!isAdmin) showToast("Success", "Notes submitted! Pending admin approval.", "success");
      }, 1500);
    } catch (err: any) {
      setUploadState("error"); setUploadErrorMsg(err.message || "Failed to upload file."); setUploading(false);
      showToast("Upload Error", err.message || "Failed to upload file.", "error");
    }
  };

  const sendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: currentUserEmail, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      showToast("Email Sent", "Verification email sent! Please check your inbox.", "success");
    } catch (err: any) { alert(err.message); }
  };
  
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery.trim()) { setGlobalSearchResults([]); return; }
      setIsSearching(true);
      const response = await searchDocuments({ query: searchQuery, limit: 8 });
      setGlobalSearchResults(response.data);
      setIsSearching(false);
    };
    const debounceTimer = setTimeout(fetchSearchResults, 300); 
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    
    const snapshotNotifications = [...notifications];
    const snapshotUnreadCount = unreadCount;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Failed to mark as read, rolling back:", error);
      setNotifications(snapshotNotifications);
      setUnreadCount(snapshotUnreadCount);
      showToast("Error", "Failed to mark notification as read", "error");
    }
  };

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => { setIsOffline(false); showToast("Connection Restored", "You are back online.", "success"); };
    const handleOffline = () => { setIsOffline(true); showToast("Connection Lost", "You are operating offline. You can still access saved bookmarks.", "error"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  return {
    pathname, mounted, isDarkMode, sidebarCollapsed, showMobileMenu, searchQuery, globalSearchResults, isSearching, sidebarLoading,
    pendingCount, trendingDocs, notifications, unreadCount, showNotifications, activeToast, isAdmin, isStudent, 
    emailConfirmed, currentUserEmail, showAuthModal, authPromptContext, authMode, authEmail, authPassword, authLoading, googleLoading,
    globalToast, isOffline, showUploadForm, uploading, file, uploadTitle, uploadCategory, uploadedBy, uploadSubject, 
    uploadModule, uploadState, uploadProgress, uploadErrorMsg,
    setSidebarCollapsed, setShowMobileMenu, setSearchQuery, setShowNotifications, setActiveToast, setShowAuthModal, 
    setAuthMode, setAuthEmail, setAuthPassword, setShowUploadForm, setFile, setUploadTitle, setUploadCategory, 
    setUploadedBy, setUploadSubject, setUploadModule, setGlobalToast, setNotifications, toggleTheme, handleGoogleLogin, 
    handleAuthSubmit, handleLogout, handleUpload, sendVerificationEmail, handleMarkAsRead, openAuthPrompt, handleAuthModalOpenChange
  };
}

export type ClientLayoutContext = ReturnType<typeof useClientLayout>;
