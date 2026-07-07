"use client";

import { useAuth } from "@/app/context/AuthContext";
import { GraduationCap, ShieldCheck, Cloud, Zap, Users } from "lucide-react";
import { FeaturesCarousel } from "./FeaturesCarousel";

export interface PlatformStats {
  subjects: number;
  modules: number;
  views: number;
  downloads: number;
}

export function LandingHero({ stats, trendingDocs = [] }: { stats?: PlatformStats, trendingDocs?: any[] }) {
  const { setAuthMode, setShowAuthModal } = useAuth();

  const handleSignUp = () => {
    setAuthMode("signup");
    setShowAuthModal(true);
  };

  return (
    <div className="relative mx-auto max-w-full px-4 pt-16 sm:pt-24 pb-12 overflow-hidden">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -z-10 aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 bg-gradient-to-tr from-primary/10 to-transparent opacity-40 sm:w-[72.1875rem] blur-3xl"></div>
      </div>

      <div className="flex flex-col items-center text-center">
        {/* Top Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary dark:bg-primary/20">
          <GraduationCap size={16} />
          Built for Students, by Students
        </div>

        {/* Headline */}
        <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
          Everything You Need to <br className="hidden sm:block" />
          Study <span className="text-primary">Smarter</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Explore the powerful features designed to help you access, organize, and
          make the most of your academic journey.
        </p>

        {/* CTA (Optional but good for conversions, not explicitly in the cropped screenshot but typically below subtitle) */}
        <div className="mb-16">
          <button
            onClick={handleSignUp}
            className="motion-hover motion-active rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg hover:opacity-90 hover:shadow-primary/25"
          >
            Get Started for Free
          </button>
        </div>
      </div>

      {/* Carousel Section */}
      <div className="mb-20">
        <FeaturesCarousel trendingDocs={trendingDocs} />
      </div>

      {/* Bottom Features Row */}
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 px-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Trusted & Secure</h4>
              <p className="text-sm text-muted">Your data and privacy are always protected.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <Cloud size={24} />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Cloud Sync</h4>
              <p className="text-sm text-muted">Access your library from anywhere, anytime.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <Zap size={24} />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Fast & Lightweight</h4>
              <p className="text-sm text-muted">Optimized for speed and a smooth experience.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
              <Users size={24} />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Built for Students</h4>
              <p className="text-sm text-muted">Made with ❤️ to support your academic success.</p>
            </div>
          </div>
        </div>

        {/* Real Analytics / Social Proof */}
        {stats && (
          <div className="mt-16 border-t border-border/50 pt-10">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-primary">{stats.subjects}+</p>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted mt-1">Subjects</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-foreground">{stats.downloads.toLocaleString()}</p>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted mt-1">Downloads</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-foreground">{stats.views.toLocaleString()}</p>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted mt-1">Views</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
