"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";

interface ProfileDropdownProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}

export default function ProfileDropdown({ userName, userEmail, onLogout }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const initials = userName.substring(0, 2).toUpperCase() || "ST";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // 1. Handle Escape
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      // 2. Handle Arrow Navigation
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); // Prevents the whole page from scrolling
        
        // Find all interactive menu items
        const menuElement = dropdownRef.current?.querySelector('[role="menu"]');
        if (!menuElement) return;
        
        const items = Array.from(menuElement.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length === 0) return;

        const currentIndex = items.indexOf(document.activeElement as HTMLElement);

        if (event.key === "ArrowDown") {
          // Move down or loop back to top
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
        } else if (event.key === "ArrowUp") {
          // Move up or loop back to bottom
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User menu"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-[#4F46E5] text-xs font-bold text-white transition-all ${isOpen ? 'ring-2 ring-[#4F46E5] ring-offset-2 dark:ring-offset-[#0d0f1a]' : ''}`}
      >
        {initials}
      </button>

      {isOpen && (
        <div 
          role="menu"
          className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]"
        >
          <div className="border-b border-[#E5E7EB] px-3 pb-3 pt-2 dark:border-[#1F2A44]">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
          </div>
          <div className="py-2 space-y-1">
            <Link 
              href="/profile" 
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#64748B] hover:bg-gray-50 hover:text-indigo-500 focus:bg-gray-50 focus:text-indigo-500 focus:outline-none dark:text-[#94A3B8] dark:hover:bg-[#1F2A44] dark:hover:text-indigo-400 dark:focus:bg-[#1F2A44]"
            >
              <User size={16} aria-hidden="true"/> My Profile
            </Link>
            <button 
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#64748B] hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:text-[#94A3B8] dark:hover:bg-[#1F2A44] dark:focus:bg-[#1F2A44]"
            >
              <Settings size={16} aria-hidden="true"/> Settings
            </button>
          </div>
          <div className="border-t border-[#E5E7EB] pt-2 dark:border-[#1F2A44]">
            <button 
              role="menuitem"
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:hover:bg-red-900/20 dark:focus:bg-red-900/20"
            >
              <LogOut size={16} aria-hidden="true"/> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}