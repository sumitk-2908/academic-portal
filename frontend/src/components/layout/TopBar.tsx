"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  GraduationCap, Search, Moon, Sun, PanelLeft, PanelLeftClose, 
  Bell, CheckCheck, Plus
} from "lucide-react";
import { useSidebar } from "@/app/context/SidebarContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useAuth } from "@/app/context/AuthContext";
import { useUpload } from "@/app/context/UploadContext";
import { useNotifications } from "@/app/context/NotificationsContext";
import ProfileDropdown from "@/components/profile/ProfileDropdown";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { supabase } from "@/app/lib/api";

const SearchTrigger = ({ onOpen, isMac }: { onOpen: () => void; isMac: boolean }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-haspopup="dialog"
    className="motion-hover motion-active flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-hover px-3 text-left text-muted shadow-sm hover:bg-surface hover:text-foreground md:max-w-md lg:max-w-xl"
  >
    <span className="flex min-w-0 items-center gap-2">
      <Search size={17} aria-hidden="true" />
      <span className="truncate text-sm font-semibold">Search...</span>
    </span>
    <kbd className="hidden shrink-0 rounded-lg border border-border bg-surface px-2 py-1 font-mono text-xs font-bold text-muted shadow-sm md:inline-flex">
      {isMac ? "⌘K" : "Ctrl K"}
    </kbd>
  </button>
);

export const TopBar = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const { isDarkMode, toggleTheme, mounted } = useTheme();
  const { isAdmin, isStudent, userProfile, uploadedBy, currentUserEmail, handleLogout, setShowProfileGate, openAuthPrompt } = useAuth();
  const { setShowUploadForm } = useUpload();
  const { unreadCount, setShowNotifications, showNotifications, notifications, setNotifications, handleMarkAsRead } = useNotifications();

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isMac] = useState(() => typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac"));

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
  <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
    <div className="mx-auto flex min-h-16 w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
      
      <div className="flex shrink-0 items-center gap-2.5">
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden rounded-xl p-2 text-muted hover:bg-surface-hover lg:inline-flex">
          {sidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap size={20} />
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-extrabold tracking-tight">Academic Portal</p>
          </div>
        </Link>
      </div>

      <div className="order-3 flex w-full min-w-0 justify-center md:order-none md:flex-1">
        <SearchTrigger onOpen={() => setIsCommandOpen(true)} isMac={isMac} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button onClick={toggleTheme} className="motion-hover motion-active flex size-9 items-center justify-center rounded-xl border border-border text-foreground hover:bg-surface-hover">
          {mounted ? (isDarkMode ? <Sun size={18} /> : <Moon size={18} />) : null}
        </button>
        
        {(isAdmin || isStudent) && (
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative flex size-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-surface-hover">
              <Bell size={18} className="text-muted" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white shadow-sm ring-2 ring-surface">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <ErrorBoundary title="Notifications could not load" className="m-2" message="Notifications panel hit an unexpected problem.">
                <div className="animate-in slide-in-from-top-2 motion-dropdown absolute top-12 -right-2 z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-2xl sm:right-0 sm:w-80">
                  <div className="flex items-center justify-between border-b border-border p-3">
                    <p className="text-xs font-bold tracking-wider text-muted uppercase">Notifications</p>
                    <div className="flex items-center gap-2">
                      {notifications.some((n) => n.is_read) && (
                        <button 
                          onClick={async () => {
                            if(window.confirm("Are you sure you want to clear all read notifications?")) {
                              const { data: sess } = await supabase.auth.getSession();
                              if (sess?.session?.user) {
                                const { error } = await supabase.from('notifications').delete().eq('user_id', sess.session.user.id).eq('is_read', true);
                                if (!error) setNotifications(prev => prev.filter(n => !n.is_read));
                              }
                            }
                          }}
                          className="text-xs font-bold tracking-[0.06em] text-destructive transition-opacity hover:opacity-80"
                        >Clear Read</button>
                      )}
                      {unreadCount > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold tracking-[0.06em] text-primary">{unreadCount} New</span>}
                    </div>
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-muted">You&apos;re all caught up!</p>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} onClick={() => handleMarkAsRead(notif.id, notif.is_read)} className={`flex cursor-pointer flex-col gap-1 rounded-xl p-3 transition-colors hover:bg-surface-hover ${!notif.is_read ? "bg-accent/50" : ""}`}>
                          <div className="flex items-start justify-between">
                            <p className={`text-xs ${!notif.is_read ? "font-bold text-foreground" : "font-semibold text-muted"}`}>{notif.title}</p>
                            {!notif.is_read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /> : <CheckCheck size={12} className="mt-0.5 shrink-0 text-success" />}
                          </div>
                          <p className="text-xs leading-tight text-muted">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </ErrorBoundary>
              </>
            )}
          </div>
        )}

        {(isAdmin || isStudent) ? (
          <div className="flex items-center gap-3">
            <button onClick={() => {
              if (isAdmin || userProfile.full_name) {
                setShowUploadForm(true);
              } else {
                setShowProfileGate(true);
              }
            }} className="motion-hover motion-active flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90 sm:px-4">
              <Plus size={14} /> <span>{isAdmin ? "Upload" : "Contribute"}</span>
            </button>
            <div className="hidden sm:block">
              <ProfileDropdown userName={uploadedBy || (isAdmin ? "Admin" : "Student")} userEmail={currentUserEmail} onLogout={handleLogout} />
            </div>
          </div>
        ) : (
          <button onClick={() => openAuthPrompt("upload")} className="motion-hover motion-active flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 sm:px-4">
            <Plus size={14} /> <span>Contribute</span>
          </button>
        )}
      </div>
      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} isMac={isMac} />
    </div>
  </header>
  );
};

