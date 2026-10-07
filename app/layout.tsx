import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppLayout } from "@/components/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flossi — Casablanca Stock Exchange Analysis",
  description: "Personal stock analysis application focused on companies listed on the Casablanca Stock Exchange.",
  openGraph: {
    title: "Flossi — Casablanca Stock Exchange Analysis",
    description: "Personal stock analysis application focused on companies listed on the Casablanca Stock Exchange.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
