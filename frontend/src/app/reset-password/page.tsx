"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/api/core";
import { KeyRound, ArrowRight } from "lucide-react";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { useNotifications } from "@/app/context/NotificationsContext";

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setGlobalToast } = useNotifications();
  const router = useRouter();

  const calculateStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(4, score);
  };

  const strength = calculateStrength(newPassword);

  const setToast = (t: { open: boolean, message: string }) => {
    setGlobalToast({ open: t.open, title: 'Success', message: t.message, type: 'success' });
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Secure recovery session established.");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Password must be at least 8 characters long, contain an uppercase letter and a number.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setToast({ open: true, message: "Password successfully updated! Redirecting..." });

      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push("/");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to update password. Your link may have expired.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound size={28} aria-hidden="true" />
            </div>
            <h1 className="mb-1.5 text-3xl font-extrabold tracking-tight text-foreground">Secure Reset</h1>
            <p className="mt-2 text-base text-muted">
              Enter a new password for your student account.
            </p>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-5">
            <div>
              <label
                htmlFor="newPassword"
                className="mb-1.5 block text-xs font-bold tracking-[0.06em] text-muted uppercase"
              >
                New Password
              </label>

              <input
                id="newPassword"
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="motion-focus h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-primary focus:bg-surface"
              />
              
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full ${
                      newPassword.length === 0
                        ? "bg-border"
                        : strength >= level
                        ? strength < 2
                          ? "bg-destructive"
                          : strength < 3
                          ? "bg-warning"
                          : "bg-success"
                        : "bg-surface-hover"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Requires 8+ chars, 1 uppercase, 1 number.
              </p>
            </div>

            {error && (
              <p
                aria-live="polite"
                role="alert"
                className="rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="motion-hover motion-active flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <InlineSpinner label="Updating password" size={18} />
                  <span aria-live="polite" className="sr-only">
                    Updating password...
                  </span>
                  <span aria-hidden="true">Updating...</span>
                </>
              ) : (
                <>
                  Update Password <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <ErrorBoundary
      title="Password reset could not load"
      message="An error occurred during password reset. Please use the link from your email again."
    >
      <ResetPasswordContent />
    </ErrorBoundary>
  );
}
