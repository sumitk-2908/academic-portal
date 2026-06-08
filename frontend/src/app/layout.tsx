import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Academic Portal | Premium Student Learning Platform",
  description:
    "Everything a first-year B.Tech student needs — notes, PYQs, syllabus, and resources in one beautifully organized place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f19" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${geistSans.variable} ${geistMono.variable} bg-background`}>
      <head>
        {/* Synchronous script to prevent Flash of Incorrect Theme (FOIT) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('theme');
                let prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
