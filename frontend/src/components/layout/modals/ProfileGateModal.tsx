"use client";

import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "@/app/context/AuthContext";
import { useUpload } from "@/app/context/UploadContext";

export const ProfileGateModal = () => {
  const router = useRouter();
  const { showProfileGate, setShowProfileGate } = useAuth();
  const { setShowUploadForm } = useUpload();
  
  const handleLater = () => {
    setShowProfileGate(false);
    setShowUploadForm(true);
  };

  const handleSetup = () => {
    setShowProfileGate(false);
    router.push("/profile?edit=true");
  };

  return (
    <Dialog.Root open={showProfileGate} onOpenChange={setShowProfileGate}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="motion-modal data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-[100] w-full max-w-sm translate-[-50%] rounded-3xl border border-border bg-surface p-6 shadow-2xl">
          <div className="mb-6">
            <Dialog.Title className="text-lg font-extrabold text-foreground">Ready to set up your profile?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 font-medium text-muted">
              Adding your real name gives you proper attribution for your contributions and builds trust in the community.
            </Dialog.Description>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleSetup} className="motion-hover motion-active h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90">
              Set Up Profile
            </button>
            <button onClick={handleLater} className="motion-hover motion-active h-11 w-full rounded-xl bg-surface-hover font-bold text-foreground hover:opacity-80">
              Later
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
