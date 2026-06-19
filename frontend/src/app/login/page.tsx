"use client";

import { useState } from "react";
import { supabase } from "../lib/api";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, GraduationCap } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const router = useRouter();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message);
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let authError;
      
      if (isSignUp) {
        // Because "Confirm Email" is OFF in Supabase, this instantly logs them in
        const { error } = await supabase.auth.signUp({ email, password });
        authError = error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authError = error;
      }

      if (authError) throw authError;

      // Route straight to the "Aha" moment
      router.push("/");
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4 dark:bg-[#0B1020]">
      <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]">
        
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4F46E5]/10 text-[#4F46E5]">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
            Welcome to the Portal
          </h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Access crowdsourced notes, PYQs, and syllabuses instantly.
          </p>
        </div>

        {/* 1. The Frictionless Google Route */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-white font-bold text-[#0F172A] transition-all hover:bg-gray-50 hover:shadow-sm dark:border-[#1F2A44] dark:bg-[#111827] dark:text-white dark:hover:bg-[#1A2332]"
        >
          {googleLoading ? <Loader2 className="animate-spin text-[#64748B]" size={20} /> : <><FcGoogle size={24} /> Continue with Google</>}
        </button>

        {/* 2. The Visual Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-[#E5E7EB] dark:border-[#1F2A44]"></div>
          <span className="mx-4 text-xs font-semibold uppercase text-[#64748B] dark:text-[#94A3B8]">Or use email</span>
          <div className="flex-grow border-t border-[#E5E7EB] dark:border-[#1F2A44]"></div>
        </div>

        {/* 3. The Standard Fallback Route */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="relative">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Student Email"
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-sm outline-none focus:border-[#4F46E5] dark:border-[#1F2A44] dark:text-white"
            />
          </div>
          <div className="relative">
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-sm outline-none focus:border-[#4F46E5] dark:border-[#1F2A44] dark:text-white"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] font-bold text-white transition-colors hover:bg-[#6366F1]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? "Create Account" : "Sign In")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-bold text-[#4F46E5] hover:underline"
          >
            {isSignUp ? "Sign In" : "Create one now"}
          </button>
        </div>

      </div>
    </div>
  );
}