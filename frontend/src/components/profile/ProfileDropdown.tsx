"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";

interface ProfileDropdownProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export default function ProfileDropdown({
  userName,
  userEmail,
  onLogout,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const initials = userName.substring(0, 2).toUpperCase() || "ST";

  // Handle dropdown outside click & keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const menuElement = dropdownRef.current?.querySelector('[role="menu"]');
        if (!menuElement) return;

        const items = Array.from(menuElement.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length === 0) return;

        const currentIndex = items.indexOf(document.activeElement as HTMLElement);

        if (event.key === "ArrowDown") {
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
        } else if (event.key === "ArrowUp") {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prevIndex]?.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Lock body scroll when Sign Out Modal is open
  useEffect(() => {
    if (isSignOutModalOpen) {
      window.document.body.style.overflow = "hidden";
    } else {
      window.document.body.style.overflow = "unset";
    }
    return () => {
      window.document.body.style.overflow = "unset";
    };
  }, [isSignOutModalOpen]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="User menu"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground motion-hover motion-active ${
            isOpen ? "ring-2 ring-primary ring-offset-2" : ""
          }`}
        >
          {initials}
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border bg-surface p-2 shadow-2xl motion-dropdown animate-in fade-in zoom-in-95"
          >
            <div className="border-b border-border px-3 pb-3 pt-2">
              <p className="truncate text-sm font-bold text-foreground">
                {userName}
              </p>
              <p className="truncate text-xs text-muted">
                {userEmail}
              </p>
            </div>

            <div className="space-y-1 py-2">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted motion-hover focus:outline-none hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
              >
                <User size={16} aria-hidden="true" /> My Profile
              </Link>

              <button
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted motion-hover focus:outline-none hover:bg-surface-hover focus:bg-surface-hover"
              >
                <Settings size={16} aria-hidden="true" /> Settings
              </button>
            </div>

            <div className="border-t border-border pt-2">
              <button
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  setIsSignOutModalOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-destructive motion-hover focus:outline-none hover:bg-destructive/10 focus:bg-destructive/10"
              >
                <LogOut size={16} aria-hidden="true" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-border p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-2">Sign Out</h2>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to sign out? You will need to log back in to access your study materials and contributions.
            </p>
            
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="flex-1 rounded-xl bg-surface-hover border border-border py-2.5 text-sm font-bold text-foreground transition-colors hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onLogout();
                  window.location.href = "/";
                }}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground transition-colors hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}