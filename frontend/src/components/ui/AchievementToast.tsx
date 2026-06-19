"use client";
import { useEffect, useState } from "react";
import { Medal, X } from "lucide-react";

interface ToastProps {
  title: string;
  description: string;
  duration?: number;
  onClose: () => void;
}

export default function AchievementToast({ title, description, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to trigger animation
    setTimeout(() => setIsVisible(true), 50);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation before unmounting
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm transform items-start gap-4 rounded-2xl border border-yellow-200 bg-white p-4 shadow-xl transition-all duration-300 ease-out dark:border-yellow-900/50 dark:bg-[#131625]
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}
      `}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500">
        <Medal size={20} />
      </div>
      
      <div className="flex-1">
        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">🏆 Badge Unlocked!</h4>
        <p className="mt-0.5 text-xs font-bold text-yellow-600 dark:text-yellow-500">{title}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      <button 
        onClick={() => setIsVisible(false)}
        className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X size={16} />
      </button>
    </div>
  );
}