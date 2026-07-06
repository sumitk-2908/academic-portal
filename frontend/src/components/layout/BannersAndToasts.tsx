"use client";

import * as Toast from "@radix-ui/react-toast";
import { Mail, WifiOff } from "lucide-react";
import { ClientLayoutContext } from "@/app/hooks/useClientLayout";
import AchievementToast from "@/components/ui/AchievementToast";

export const BannersAndToasts = ({ ctx }: { ctx: ClientLayoutContext }) => (
  <>
    {ctx.isStudent && !ctx.emailConfirmed && (
      <div className="z-50 flex items-center justify-center gap-2 bg-warning/10 px-4 py-2 text-center text-xs font-semibold text-warning">
        <Mail size={14} /><span>Please verify your email address to unlock upload privileges.</span>
        <button onClick={ctx.sendVerificationEmail} className="ml-2 font-bold underline hover:opacity-80">Send Link</button>
      </div>
    )}
    {ctx.isOffline && (
      <div className="z-40 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-semibold text-white">
        <WifiOff size={14} /><span>You are currently offline. Viewing cached pages only.</span>
      </div>
    )}
    {ctx.activeToast && <AchievementToast title={ctx.activeToast.title} description={ctx.activeToast.description} onClose={() => ctx.setActiveToast(null)} />}
    <Toast.Root open={ctx.globalToast.open} onOpenChange={(open) => ctx.setGlobalToast(prev => ({...prev, open}))} className={`fixed right-4 bottom-4 z-[150] w-auto max-w-md rounded-xl border p-4 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${ctx.globalToast.type === 'error' ? 'border-destructive/20 bg-destructive/10' : ctx.globalToast.type === 'success' ? 'border-success/20 bg-success/10' : 'border-border bg-surface'}`}>
      <Toast.Title className={`text-sm font-bold ${ctx.globalToast.type === 'error' ? 'text-destructive' : ctx.globalToast.type === 'success' ? 'text-success' : 'text-foreground'}`}>{ctx.globalToast.title}</Toast.Title>
      <Toast.Description className={`mt-1 text-xs ${ctx.globalToast.type === 'error' ? 'text-destructive/80' : ctx.globalToast.type === 'success' ? 'text-success/80' : 'text-muted'}`}>{ctx.globalToast.message}</Toast.Description>
    </Toast.Root>
  </>
);
