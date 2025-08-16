import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oxlas Suite - Google Workspace Alternative",
  description: "A complete Google Workspace alternative with Mail, Drive, Docs, Meet, Calendar, and more. Built with modern web technologies.",
  keywords: ["Oxlas Suite", "Google Workspace", "Mail", "Drive", "Docs", "Meet", "Calendar", "SaaS"],
  authors: [{ name: "Oxlas Team" }],
  openGraph: {
    title: "Oxlas Suite",
    description: "A complete Google Workspace alternative",
    url: "https://oxlas.com",
    siteName: "Oxlas Suite",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oxlas Suite",
    description: "A complete Google Workspace alternative",
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
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
