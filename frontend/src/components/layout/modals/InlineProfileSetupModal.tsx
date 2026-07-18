"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { InlineSpinner } from "@/components/layout/SharedLayouts";
import { updateProfilePreferences } from "@/app/lib/api/profile";
import { dispatchToast as showToast } from "@/app/lib/toast";
import { useAuth } from "@/app/context/AuthContext";

interface InlineProfileSetupModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const InlineProfileSetupModal = ({ isOpen, onOpenChange, onSuccess }: InlineProfileSetupModalProps) => {
  const { userProfile, updateUserProfile } = useAuth();
  const [name, setName] = useState(userProfile?.full_name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: sess } = await (await import("@/app/lib/api/core")).supabase.auth.getSession();
      if (!sess?.session?.user?.id) throw new Error("Not authenticated");

      await updateProfilePreferences(sess.session.user.id, { full_name: name.trim() });
      updateUserProfile({ full_name: name.trim() });
      
      showToast("Profile Updated", "You can now participate in discussions.", "success");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      showToast("Update Failed", "Something went wrong saving your name.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-[100] w-full max-w-sm translate-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl">
          <div className="mb-6">
            <Dialog.Title className="text-lg font-extrabold text-foreground">Set your display name</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 font-medium text-muted">
              To keep discussions helpful and accountable, we ask that you set a display name before commenting.
            </Dialog.Description>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="inline-full-name" className="sr-only">Full Name</label>
              <input
                id="inline-full-name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="motion-focus w-full rounded-xl border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <button 
                type="submit" 
                disabled={isSubmitting || !name.trim()}
                className="motion-hover motion-active flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? <InlineSpinner label="Saving" size={16} /> : null}
                Save & Continue
              </button>
              <Dialog.Close asChild>
                <button type="button" className="motion-hover motion-active h-11 w-full rounded-xl bg-surface-hover font-bold text-foreground hover:opacity-80">
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
