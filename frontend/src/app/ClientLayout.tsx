"use client";

import * as Toast from "@radix-ui/react-toast";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { NotificationsProvider } from "@/app/context/NotificationsContext";
import { AuthProvider } from "@/app/context/AuthContext";
import { SidebarProvider } from "@/app/context/SidebarContext";
import { UploadProvider } from "@/app/context/UploadContext";
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
  return (
    <ThemeProvider>
      <NotificationsProvider>
        <AuthProvider>
          <SidebarProvider>
            <UploadProvider>
              <Toast.Provider swipeDirection="right">
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
                <Toast.Viewport className="fixed right-0 bottom-0 z-[150] flex w-full flex-col gap-2 p-6 outline-none md:max-w-[400px]" />
              </Toast.Provider>
            </UploadProvider>
          </SidebarProvider>
        </AuthProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}