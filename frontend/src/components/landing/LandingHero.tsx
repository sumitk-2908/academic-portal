"use client";

import { useAuth } from "@/app/context/AuthContext";
import { BookOpen, Share2, Search, ArrowRight } from "lucide-react";

export function LandingHero() {
  const { setAuthMode, setShowAuthModal } = useAuth();

  const handleSignUp = () => {
    setAuthMode("signup");
    setShowAuthModal(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
      <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
        The Ultimate <span className="text-primary">Academic Resource Hub</span>
      </h1>
      <p className="mx-auto mb-10 max-w-2xl text-lg text-muted sm:text-xl">
        Access, share, and organize course materials, notes, and previous year questions. Join thousands of students collaborating for better grades.
      </p>
      
      <div className="mb-16 flex justify-center gap-4">
        <button
          onClick={handleSignUp}
          className="motion-hover motion-active flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-sm hover:opacity-90"
        >
          Join the Community <ArrowRight size={18} />
        </button>
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen size={24} />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Curated Materials</h2>
          <p className="text-sm text-muted">Access structured notes, tutorials, and PYQs organized by subject and module.</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-success/10 text-success">
            <Share2 size={24} />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Contribute</h2>
          <p className="text-sm text-muted">Upload your own study materials and help your peers succeed.</p>
        </div>
        
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <Search size={24} />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Lightning Fast</h2>
          <p className="text-sm text-muted">Find exactly what you need with our global fuzzy search and command palette.</p>
        </div>
      </div>
    </div>
  );
}
