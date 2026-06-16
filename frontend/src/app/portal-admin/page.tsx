"use client";

import { useState } from "react";
import { supabase } from "../lib/api";
import { useRouter } from "next/navigation";
import { Shield, Lock, Loader2 } from "lucide-react";

export default function AdminPortalLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Validate DB Role immediately
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (roleError || roleData?.role !== 'admin') {
        // If not an admin, instantly log them out and reject access
        await supabase.auth.signOut();
        throw new Error("Unauthorized: Account lacks administrator privileges.");
      }

      // 3. Set secure context flag (SessionStorage clears automatically on tab close)
      sessionStorage.setItem("admin_portal_auth", "true");
      
      // 4. Route to dashboard
      router.push("/");
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#0B1020] p-4">
      <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Admin Gateway</h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">Secure authentication required.</p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="relative">
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Administrator Email"
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-sm outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white"
            />
          </div>
          <div className="relative">
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Secure Password"
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-sm outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Authenticate Session</>}
          </button>
        </form>
      </div>
    </div>
  );
}