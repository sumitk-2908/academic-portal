"use client";

import { useState } from "react";
import { supabase } from "../lib/api";
import { useRouter } from "next/navigation";
import { Shield, Lock, Loader2, Mail, KeyRound, QrCode } from "lucide-react";

type AuthStep = "LOGIN" | "MFA_SETUP" | "MFA_VERIFY";

export default function AdminPortalLogin() {
  const router = useRouter();
  
  // UI State
  const [step, setStep] = useState<AuthStep>("LOGIN");
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  // MFA State
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Primary Authentication (AAL1)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Database Authorization Check
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (adminError || !adminData) {
        // Instantly sign out unauthorized users
        await supabase.auth.signOut();
        throw new Error("Unauthorized: Account lacks administrator privileges.");
      }

      // 3. Check for existing MFA factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factorsData?.totp[0];

      if (!totpFactor) {
        // 4a. Initial MFA Setup: Generate QR Code
        const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
        });
        if (enrollError) throw enrollError;

        setFactorId(enrollData.id);
        setQrCode(enrollData.totp.qr_code);
        setStep("MFA_SETUP");
      } else {
        // 4b. Existing MFA: Proceed to verification
        if (totpFactor.status === "verified") {
          setFactorId(totpFactor.id);
          setStep("MFA_VERIFY");
        } else {
          // Edge case: Enrolled but never verified. Start fresh.
          await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
          throw new Error("Incomplete MFA setup. Please log in again to generate a new QR code.");
        }
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      // 2. Verify the code against the challenge
      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: otp,
      });
      if (verifyError) throw verifyError;

      // 3. Success! Session is now AAL2
      sessionStorage.setItem("admin_portal_auth", "true");
      router.push("/");
      
    } catch (err: any) {
      alert(`Invalid Authenticator Code: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4 dark:bg-[#0B1020]">
      <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]">
        
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Admin Gateway</h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
            {step === "LOGIN" && "Secure authentication required."}
            {step === "MFA_SETUP" && "Scan this QR code in Google or Microsoft Authenticator."}
            {step === "MFA_VERIFY" && "Enter the 6-digit code from your Authenticator app."}
          </p>
        </div>

        {step === "LOGIN" && (
          <form onSubmit={handleLogin} className="space-y-4">
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={18} /> Authenticate</>}
            </button>
          </form>
        )}

        {step === "MFA_SETUP" && (
          <div className="flex flex-col items-center space-y-6">
            {/* Display the SVG QR Code generated by Supabase */}
            <div 
              className="rounded-xl border-4 border-white bg-white p-2 shadow-sm"
              dangerouslySetInnerHTML={{ __html: qrCode }} 
            />
            <form onSubmit={handleVerifyOTP} className="w-full space-y-4">
              <input
                required
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-center text-xl tracking-widest outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><QrCode size={18} /> Verify & Activate MFA</>}
              </button>
            </form>
          </div>
        )}

        {step === "MFA_VERIFY" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input
              required
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              autoFocus
              className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-center text-xl tracking-widest outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><KeyRound size={18} /> Verify Access</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}