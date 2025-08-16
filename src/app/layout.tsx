import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { MotionWrapper } from "@/components/ui/motion-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oxl Workspace - Enterprise Collaboration Platform",
  description: "A comprehensive workspace solution with Mail, Meet, Docs, and Drive collaboration tools.",
  keywords: ["Oxl", "Workspace", "Collaboration", "Mail", "Meet", "Docs", "Drive", "Enterprise"],
  authors: [{ name: "Oxl Team" }],
  openGraph: {
    title: "Oxl Workspace",
    description: "Enterprise collaboration platform for modern teams",
    url: "https://oxl.com",
    siteName: "Oxl Workspace",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oxl Workspace",
    description: "Enterprise collaboration platform for modern teams",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MotionWrapper type="fade" duration={0.5}>
            {children}
          </MotionWrapper>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
