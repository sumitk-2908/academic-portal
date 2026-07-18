"use client";

import { Providers } from "@/app/context/Providers";
import { AppShell, ContentArea } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BannersAndToasts } from "@/components/layout/BannersAndToasts";
import { AuthModal } from "@/components/layout/modals/AuthModal";
import { UploadModal } from "@/components/layout/modals/UploadModal";
import { OnboardingModal } from "@/components/layout/modals/OnboardingModal";
import { ProfileGateModal } from "@/components/layout/modals/ProfileGateModal";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ErrorBoundary title="Fatal App Error" message="The application shell encountered a critical error. Please reload the page.">
        <AppShell>
          <TopBar />
          <div className="mx-auto flex w-full max-w-[1600px] flex-1">
            <Sidebar />
            <ContentArea>{children}</ContentArea>
          </div>
          <MobileNav />
          <AuthModal />
          <UploadModal />
          <BannersAndToasts />
          <OnboardingModal />
          <ProfileGateModal />
        </AppShell>
      </ErrorBoundary>
    </Providers>
  );
}