"use client";

import React from "react";

export const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div className="ease-premium flex min-h-[100dvh] flex-col bg-background text-foreground transition-colors duration-300">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:p-4 focus:bg-primary focus:text-primary-foreground focus:rounded-br-xl">
      Skip to main content
    </a>
    {children}
  </div>
);

export const ContentArea = ({ children }: { children: React.ReactNode }) => (
  <main id="main-content" className="w-full min-w-0 flex-1 overflow-x-clip p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
    {children}
  </main>
);
