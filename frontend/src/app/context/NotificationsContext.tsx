"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase, getAchievements } from "@/app/lib/api";

interface NotificationsContextType {
  notifications: any[];
  unreadCount: number;
  showNotifications: boolean;
  activeToast: {title: string, description: string} | null;
  globalToast: { open: boolean, title: string, message: string, type: "default" | "error" | "success" };

  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  setShowNotifications: (v: boolean) => void;
  setActiveToast: (toast: {title: string, description: string} | null) => void;
  setGlobalToast: (toast: any) => void;
  handleMarkAsRead: (id: string, isRead: boolean) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeToast, setActiveToast] = useState<{title: string, description: string} | null>(null);
  const [globalToast, setGlobalToast] = useState({ open: false, title: "", message: "", type: "default" as "default" | "error" | "success" });
  
  const earnedBadgesRef = useRef<Set<string>>(new Set());

  const showToast = (title: string, message: string, type: "default" | "error" | "success" = "default") => {
    setGlobalToast({ open: true, title, message, type });
  };

  useEffect(() => {
    const handlePortalToast = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail) showToast(detail.title, detail.message, detail.type);
    };

    window.addEventListener("portal_toast", handlePortalToast);
    return () => window.removeEventListener("portal_toast", handlePortalToast);
  }, []);

  useEffect(() => {
    let achieveChannel: any;
    let notifChannel: any;
    let notifUpdateChannel: any;

    const setupDataAndListeners = async (userId: string) => {
      const initialBadges = await getAchievements(userId);
      earnedBadgesRef.current = new Set(initialBadges.map((b: any) => b.badge_id));

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }

      achieveChannel = supabase
        .channel(`achievements-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` }, (payload) => {
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
        .channel(`notifications-${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
            setActiveToast({ title: payload.new.title, description: payload.new.message });
          })
        .subscribe();

      notifUpdateChannel = supabase
        .channel(`notifications-update-${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
            setNotifications(prev => {
              const updatedList = prev.map(n => n.id === payload.new.id ? payload.new : n);
              setUnreadCount(updatedList.filter(n => !n.is_read).length);
              return updatedList;
            });
          })
        .subscribe();
    };

    const cleanupListeners = () => {
      if (achieveChannel) supabase.removeChannel(achieveChannel);
      if (notifChannel) supabase.removeChannel(notifChannel);
      if (notifUpdateChannel) supabase.removeChannel(notifUpdateChannel);
    };

    const handleSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setupDataAndListeners(session.user.id);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        earnedBadgesRef.current.clear();
      }
    };

    handleSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cleanupListeners();
      if (session?.user) {
        setupDataAndListeners(session.user.id);
      } else {
        setNotifications([]);
        setUnreadCount(0);
        earnedBadgesRef.current.clear();
      }
    });

    return () => {
      cleanupListeners();
      subscription.unsubscribe();
    };
  }, []);

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

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount, showNotifications, activeToast, globalToast,
      setNotifications, setShowNotifications, setActiveToast, setGlobalToast, handleMarkAsRead
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
