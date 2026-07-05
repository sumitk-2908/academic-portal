"use client";

import { StudyHistoryProvider } from "@/app/context/StudyHistoryContext";
import * as Toast from "@radix-ui/react-toast";
import { useClientLayout } from "@/app/hooks/useClientLayout";
import { 
  AppShell, TopBar, Sidebar, ContentArea, MobileNav, 
  AuthModal, UploadModal, BannersAndToasts, OnboardingModal, ProfileGateModal
} from "@/components/layout/LayoutComponents";

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