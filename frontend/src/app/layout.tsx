import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import ClientLayout from "./ClientLayout";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

// 1. Add the Viewport config (Required for PWAs)
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevents auto-zooming on mobile inputs
  userScalable: false,
};

// 2. Add the manifest reference to Metadata
export const metadata: Metadata = {
  title: "Academic Portal",
  description: "Student Resource and PDF Study Hub",
  manifest: "/manifest.json", // <-- Link to your newly created manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Academic Portal",
  },
  formatDetection: {
    telephone: false,
  },
};


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${geistSans.variable} ${geistMono.variable} bg-background`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {}
          `}
        </Script>
      </head>
      <body suppressHydrationWarning className="min-h-screen flex flex-col font-sans antialiased">
        
        {/* THIS IS YOUR SINGLE APP SHELL */}
        <ClientLayout>
          {children}
        </ClientLayout>

      </body>
    </html>
  );
}