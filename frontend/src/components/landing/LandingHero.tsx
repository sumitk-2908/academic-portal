"use client";

import { useAuth } from "@/app/context/AuthContext";
import { BookOpen, Share2, ArrowRight, Download, Eye, FileText, CheckCircle2 } from "lucide-react";

export interface PlatformStats {
  subjects: number;
  modules: number;
  views: number;
  downloads: number;
}

export function LandingHero({ stats }: { stats?: PlatformStats }) {
  const { setAuthMode, setShowAuthModal } = useAuth();

  const handleSignUp = () => {
    setAuthMode("signup");
    setShowAuthModal(true);
  };

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/20 to-success/20 opacity-30 sm:left-[calc(50%-40rem)] sm:w-[72.1875rem]"></div>
      </div>

      <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
        {/* Left Column: Value Prop */}
        <div className="text-center lg:text-left">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            Your Academic <span className="text-primary">Companion</span>
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-muted sm:text-xl">
            Access, share, and organize course materials. Join your peers and study smarter with crowd-sourced notes, tutorials, and previous year questions.
          </p>
          
          <div className="mb-12 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <button
              onClick={handleSignUp}
              className="motion-hover motion-active flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-sm hover:opacity-90 sm:w-auto"
            >
              Get Started for Free <ArrowRight size={18} />
            </button>
          </div>

          {/* Real Analytics / Social Proof */}
          {stats && (
            <div className="flex flex-wrap justify-center gap-8 lg:justify-start">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-surface text-muted">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-foreground">{stats.subjects}+</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Subjects</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-surface text-muted">
                  <Download size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-foreground">{stats.downloads.toLocaleString()}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Downloads</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-surface text-muted">
                  <Eye size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-foreground">{stats.views.toLocaleString()}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Views</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Mockup */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="animate-fade-up relative rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/20">
            {/* Mockup Header */}
            <div className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Data Structures Notes</h3>
                  <p className="text-sm text-muted">Module 1 • High Quality</p>
                </div>
              </div>
              <div className="hidden rounded-full bg-success/20 px-4 py-1.5 text-xs font-bold text-success sm:block">
                Approved
              </div>
            </div>

            {/* Mockup Content (Fake PDF/Notes) */}
            <div className="space-y-4 p-2">
              <div className="h-4 w-3/4 rounded-md bg-border/60"></div>
              <div className="h-4 w-full rounded-md bg-border/60"></div>
              <div className="h-4 w-5/6 rounded-md bg-border/60"></div>
              <div className="h-24 w-full rounded-xl bg-border/60"></div>
              <div className="h-4 w-2/3 rounded-md bg-border/60"></div>
              <div className="h-4 w-4/5 rounded-md bg-border/60"></div>
            </div>

            {/* Floating Badges */}
            <div className="absolute -right-6 -top-6 flex animate-bounce items-center gap-2 rounded-2xl border border-white/20 bg-white/40 px-5 py-3 shadow-xl backdrop-blur-xl dark:bg-black/50" style={{ animationDuration: '3s' }}>
              <CheckCircle2 className="text-success" size={20} />
              <span className="text-sm font-bold tracking-tight text-foreground">Verified Resource</span>
            </div>
            
            <div className="absolute -bottom-6 -left-6 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/40 px-5 py-3 shadow-xl backdrop-blur-xl dark:bg-black/50">
              <Share2 className="text-primary" size={20} />
              <span className="text-sm font-bold tracking-tight text-foreground">Community Driven</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
