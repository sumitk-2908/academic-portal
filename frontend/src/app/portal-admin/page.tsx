"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/api";
import { Lock, Loader2, GraduationCap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      } else {
        setLoading(false);
      }
    });
  }, [router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoggingIn(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setAuthError(error.message);
      setLoggingIn(false);
    } else {
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      
      {/* Simple Header */}
      <header className="border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-foreground">Academic Portal</p>
            <p className="text-[11px] font-medium text-muted">Admin Access Area</p>
          </div>
        </div>
      </header>

      {/* Centered Login UI */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-1 -ml-2">
            <ArrowLeft size={16} /> Back to Public Portal
          </Link>
          
          <div className="animate-fade-up rounded-3xl border border-border bg-surface p-8 shadow-xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Lock size={24} />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">System Admin</h1>
              <p className="mt-1 text-sm font-medium text-muted">Sign in to manage portal resources</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-muted">Email address</label>
                <input 
                  id="login-email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@example.com" 
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-muted">Password</label>
                <input 
                  id="login-password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" 
                  required 
                />
              </div>

              {authError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                  <p className="text-xs font-semibold text-destructive text-center">{authError}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loggingIn}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background"
              >
                {loggingIn ? <><Loader2 size={16} className="animate-spin" /> Authenticating...</> : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </main>

    </div>
  );
}