"use client";

import { useEffect, useState } from "react";
import { Medal, X } from "lucide-react";

interface ToastProps {
  title: string;
  description: string;
  duration?: number;
  onClose: () => void;
}

export default function AchievementToast({
  title,
  description,
  duration = 5000,
  onClose,
}: ToastProps) {
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
      className={`fixed bottom-6 right-6 z-50 flex max-w-sm transform items-start gap-4 rounded-2xl border border-yellow-200 bg-surface p-4 shadow-xl transition-all duration-300 ease-out
        ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }
      `}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
        <Medal size={20} />
      </div>

      <div className="flex-1">
        <h4 className="text-sm font-extrabold text-foreground">
          🏆 Badge Unlocked!
        </h4>
        <p className="mt-0.5 text-xs font-bold text-yellow-600">
          {title}
        </p>
        <p className="mt-1 text-xs text-muted">
          {description}
        </p>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="shrink-0 text-gray-400 hover:text-gray-600"
      >
        <X size={16} />
      </button>
    </div>
  );
}