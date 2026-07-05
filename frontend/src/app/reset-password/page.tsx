"use client";

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/api";
import { KeyRound, ArrowRight } from "lucide-react";
import * as Toast from "@radix-ui/react-toast";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "" });
  const router = useRouter();

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

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
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
    <Toast.Provider swipeDirection="right">
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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
                className="mb-1.5 block text-xs font-bold uppercase tracking-[0.06em] text-muted"
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
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none motion-focus focus:border-primary focus:bg-surface"
              />
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-primary-foreground motion-hover motion-active hover:opacity-90 disabled:opacity-50"
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

      <Toast.Root
        open={toast.open}
        onOpenChange={(open) => setToast((prev) => ({ ...prev, open }))}
        className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
      >
        <Toast.Title className="text-sm font-bold text-success">
          Success
        </Toast.Title>

        <Toast.Description className="text-xs text-muted">
          {toast.message}
        </Toast.Description>
      </Toast.Root>

      <Toast.Viewport className="fixed bottom-0 right-0 z-[2147483647] m-0 flex w-[390px] max-w-[100vw] list-none flex-col gap-2 p-6 outline-none" />
    </Toast.Provider>
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
