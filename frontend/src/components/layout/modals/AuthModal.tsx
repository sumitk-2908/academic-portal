"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { ClientLayoutContext } from "@/app/hooks/useClientLayout";
import { AUTH_PROMPT_COPY } from "@/app/lib/auth-prompts";
import { InlineSpinner } from "@/components/layout/SharedLayouts";

export const AuthModal = ({ ctx }: { ctx: ClientLayoutContext }) => {
  const promptCopy = ctx.authPromptContext ? AUTH_PROMPT_COPY[ctx.authPromptContext] : null;
  const title = promptCopy?.title || (ctx.authMode === "signin" ? "Sign In" : ctx.authMode === "signup" ? "Sign Up" : "Reset Password");
  const description = ctx.authMode === "forgot"
    ? "Enter your email and we will send you a reset link."
    : promptCopy?.description || "Authenticate to access your student workspace.";

  return (
  <Dialog.Root open={ctx.showAuthModal} onOpenChange={ctx.handleAuthModalOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
      <Dialog.Content className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-[100] w-full max-w-md translate-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-xl font-extrabold text-foreground">{title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 font-medium text-muted">{description}</Dialog.Description>
          </div>
          <Dialog.Close asChild><button aria-label="Close" className="shrink-0 text-muted hover:opacity-80"><X size={20} /></button></Dialog.Close>
        </div>
        {ctx.authMode !== "forgot" && (
          <>
            <button type="button" onClick={ctx.handleGoogleLogin} disabled={ctx.googleLoading || ctx.authLoading} className="motion-hover motion-active flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface font-bold text-foreground hover:bg-surface-hover hover:shadow-sm">
              {ctx.googleLoading ? <InlineSpinner label="Signing in with Google" className="text-muted" size={20} /> : <><FcGoogle size={24} /> Continue with Google</>}
            </button>
            <div className="my-6 flex items-center"><div className="flex-grow border-t border-border"></div><span className="mx-4 text-xs font-extrabold tracking-[0.06em] text-muted uppercase">Or use email</span><div className="flex-grow border-t border-border"></div></div>
          </>
        )}
        <form onSubmit={ctx.handleAuthSubmit} className="space-y-4">
          <input required type="email" value={ctx.authEmail} onChange={(e) => ctx.setAuthEmail(e.target.value)} placeholder="Email Address" className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />
          {ctx.authMode !== "forgot" && <input required type="password" value={ctx.authPassword} onChange={(e) => ctx.setAuthPassword(e.target.value)} placeholder="Password" className="motion-focus h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary" />}
          <button type="submit" disabled={ctx.authLoading || ctx.googleLoading} className="motion-hover motion-active h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90">
            {ctx.authLoading ? <InlineSpinner label="Authenticating" className="mx-auto" size={18} /> : ctx.authMode === "signin" ? "Login" : ctx.authMode === "signup" ? "Create Account" : "Send Reset Link"}
          </button>
          {ctx.authMode === "signin" && (
            <div className="mt-2 flex w-full justify-between text-xs font-bold text-primary">
              <button type="button" onClick={() => ctx.setAuthMode("forgot")} className="hover:underline">Forgot Password?</button>
              <button type="button" onClick={() => ctx.setAuthMode("signup")} className="hover:underline">New student? Sign Up</button>
            </div>
          )}
          {ctx.authMode === "signup" && <button type="button" onClick={() => ctx.setAuthMode("signin")} className="mt-2 w-full text-xs font-bold text-primary hover:underline">Already have an account? Sign In</button>}
          {ctx.authMode === "forgot" && <button type="button" onClick={() => ctx.setAuthMode("signin")} className="mt-2 w-full text-xs font-bold text-primary hover:underline">Back to Sign In</button>}
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
  );
};
