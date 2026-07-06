"use client";

import React from "react";

export const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div className="ease-premium flex min-h-[100dvh] flex-col bg-background text-foreground transition-colors duration-300">
    {children}
  </div>
);

export const ContentArea = ({ children }: { children: React.ReactNode }) => (
  <main className="w-full min-w-0 flex-1 overflow-x-clip p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
    {children}
  </main>
);
