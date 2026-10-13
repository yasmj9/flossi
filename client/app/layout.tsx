import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Investment Analyzer",
  description: "Analyse d'investissement et checklist fondamentale pour la Bourse de Casablanca avec screening Shariah.",
  openGraph: {
    title: "Stock Investment Analyzer",
    description: "Analyse d'investissement et checklist fondamentale pour la Bourse de Casablanca avec screening Shariah.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
