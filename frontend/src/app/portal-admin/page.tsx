"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/api";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, QrCode } from "lucide-react";
import * as Toast from "@radix-ui/react-toast";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

type AuthStep = "MFA_SETUP" | "MFA_VERIFY";

function AdminPortalLoginContent() {
  const router = useRouter();
  
  const [isChecking, setIsChecking] = useState(true);
  const [step, setStep] = useState<AuthStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", type: "error" });

  useEffect(() => {
    const initializeMFA = async () => {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === "aal2") {
        router.push("/subject/admin/inbox");
        return;
      }

      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp[0];

      if (!totpFactor || totpFactor.status !== "verified") {
        if (totpFactor) await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });

        const { data: enrollData, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
        if (error) {
          setToast({ open: true, message: "MFA Setup Error: " + error.message, type: "error" });
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

      router.refresh();
      router.push("/subject/admin/inbox");
    } catch (err: any) {
      setToast({ open: true, message: `Invalid Authenticator Code: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) return <div className="min-h-screen bg-background" />;

  return (
    <Toast.Provider swipeDirection="right">
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Shield size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">Elevate to Admin</h1>
            <p className="mt-2 text-sm text-muted">
              {step === "MFA_SETUP"
                ? "Scan this QR code in Google or Microsoft Authenticator."
                : "Enter the 6-digit code from your Authenticator app."}
            </p>
          </div>

          {step === "MFA_SETUP" && (
            <div className="flex flex-col items-center space-y-6">
              <div
                className="rounded-xl border-4 border-white bg-surface p-2 shadow-sm"
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
                  className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-center text-xl tracking-widest outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {loading ? (
                    <InlineSpinner label="Verifying MFA" size={18} />
                  ) : (
                    <>
                      <QrCode size={18} /> Verify & Activate MFA
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {step === "MFA_VERIFY" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                required
                autoFocus
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="h-12 w-full rounded-xl border border-border bg-transparent px-4 text-center text-xl tracking-widest outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                {loading ? (
                  <InlineSpinner label="Verifying access" size={18} />
                ) : (
                  <>
                    <KeyRound size={18} /> Verify Access
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <Toast.Root
        open={toast.open}
        onOpenChange={(open) => setToast((prev) => ({ ...prev, open }))}
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
      >
        <Toast.Title className={`text-sm font-bold ${toast.type === "error" ? "text-red-500" : "text-emerald-500"}`}>
          {toast.type === "error" ? "Authentication Error" : "Success"}
        </Toast.Title>
        <Toast.Description className="text-xs text-muted">
          {toast.message}
        </Toast.Description>
      </Toast.Root>

      <Toast.Viewport className="fixed bottom-0 right-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-2 p-6 outline-none" />
    </Toast.Provider>
  );
}

export default function AdminPortalLogin() {
  return (
    <ErrorBoundary
      title="Admin access could not load"
      message="The admin sign-in flow hit an unexpected problem. Retry this section when you are ready."
    >
      <AdminPortalLoginContent />
    </ErrorBoundary>
  );
}
