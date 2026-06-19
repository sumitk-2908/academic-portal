"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/api";
import { useRouter, notFound } from "next/navigation";
import { Shield, Loader2, KeyRound, QrCode } from "lucide-react";

type AuthStep = "MFA_SETUP" | "MFA_VERIFY";

export default function AdminPortalLogin() {
  const router = useRouter();
  
  const [isChecking, setIsChecking] = useState(true);
  const [step, setStep] = useState<AuthStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    const initializeMFA = async () => {
      // 1. Gatekeeper: Must be logged in via Homepage first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        notFound(); // Completely hide route
        return;
      }

      // 2. Gatekeeper: Must be in admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (adminError || !adminData) {
        notFound(); // Not an admin? Completely hide route
        return;
      }

      // 3. Gatekeeper: Check Current MFA Level
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === 'aal2') {
        // Already fully MFA verified! Send them to dashboard.
        sessionStorage.setItem("admin_portal_auth", "true");
        router.push("/");
        return;
      }

      // 4. Load MFA Setup or Verify
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp[0];

      if (!totpFactor || totpFactor.status !== "verified") {
        // Clear any broken setups before generating a new QR code
        if (totpFactor) await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });

        const { data: enrollData, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
        if (error) {
            alert("MFA Setup Error: " + error.message);
            return;
        }
        setFactorId(enrollData.id);
        setQrCode(enrollData.totp.qr_code);
        setStep("MFA_SETUP");
      } else {
        setFactorId(totpFactor.id);
        setStep("MFA_VERIFY");
      }

      setIsChecking(false);
    };

    initializeMFA();
  }, [router]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: otp,
      });
      if (verifyError) throw verifyError;

      // Session is now AAL2
      sessionStorage.setItem("admin_portal_auth", "true");
      router.push("/");
      
    } catch (err: any) {
      alert(`Invalid Authenticator Code: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) return <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#0B1020]" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4 dark:bg-[#0B1020]">
      <div className="w-full max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-2xl dark:border-[#1F2A44] dark:bg-[#111827]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white">Elevate to Admin</h1>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
            {step === "MFA_SETUP" ? "Scan this QR code in Google or Microsoft Authenticator." : "Enter the 6-digit code from your Authenticator app."}
          </p>
        </div>

        {step === "MFA_SETUP" && (
          <div className="flex flex-col items-center space-y-6">
            <div className="rounded-xl border-4 border-white bg-white p-2 shadow-sm" dangerouslySetInnerHTML={{ __html: qrCode }} />
            <form onSubmit={handleVerifyOTP} className="w-full space-y-4">
              <input required type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-center text-xl tracking-widest outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white" />
              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><QrCode size={18} /> Verify & Activate MFA</>}
              </button>
            </form>
          </div>
        )}

        {step === "MFA_VERIFY" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <input required autoFocus type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-transparent px-4 text-center text-xl tracking-widest outline-none focus:border-amber-500 dark:border-[#1F2A44] dark:text-white" />
            <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><KeyRound size={18} /> Verify Access</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}