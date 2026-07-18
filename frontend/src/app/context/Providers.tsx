"use client";

import * as Toast from "@radix-ui/react-toast";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { NotificationsProvider } from "@/app/context/NotificationsContext";
import { AuthProvider } from "@/app/context/AuthContext";
import { SidebarProvider } from "@/app/context/SidebarContext";
import { UploadProvider } from "@/app/context/UploadContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationsProvider>
        <AuthProvider>
          <SidebarProvider>
            <UploadProvider>
              <Toast.Provider swipeDirection="right">
                <Tooltip.Provider delayDuration={300}>
                  {children}
                </Tooltip.Provider>
                <Toast.Viewport className="fixed right-0 bottom-0 z-[150] flex w-full flex-col gap-2 p-6 outline-none md:max-w-[400px]" />
              </Toast.Provider>
            </UploadProvider>
          </SidebarProvider>
        </AuthProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}
