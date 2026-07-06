"use client";

import { StudyHistoryProvider } from "@/app/context/StudyHistoryContext";
import * as Toast from "@radix-ui/react-toast";
import { useClientLayout } from "@/app/hooks/useClientLayout";
import { AppShell, ContentArea } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BannersAndToasts } from "@/components/layout/BannersAndToasts";
import { AuthModal } from "@/components/layout/modals/AuthModal";
import { UploadModal } from "@/components/layout/modals/UploadModal";
import { OnboardingModal } from "@/components/layout/modals/OnboardingModal";
import { ProfileGateModal } from "@/components/layout/modals/ProfileGateModal";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const ctx = useClientLayout();

  return (
    <StudyHistoryProvider>
      <Toast.Provider swipeDirection="right">
        
        <AppShell>
          <TopBar ctx={ctx} />
          
          <div className="mx-auto flex w-full max-w-[1600px] flex-1">
            <Sidebar ctx={ctx} />
            <ContentArea>{children}</ContentArea>
          </div>

          {/* Overlays, Modals, and Global Utilities */}
          <MobileNav ctx={ctx} />
          <AuthModal ctx={ctx} />
          <UploadModal ctx={ctx} />
          <BannersAndToasts ctx={ctx} />
          <OnboardingModal ctx={ctx} />
          <ProfileGateModal ctx={ctx} />

        </AppShell>
        
        <Toast.Viewport className="fixed right-0 bottom-0 z-[150] flex w-full flex-col gap-2 p-6 outline-none md:max-w-[400px]" />
      </Toast.Provider>
    </StudyHistoryProvider>
  );
}