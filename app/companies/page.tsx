import { Metadata } from "next";
import { CompanySearch } from "@/components/CompanySearch";

export const metadata: Metadata = {
  title: "Companies — Casablanca Stock Exchange",
  description: "Casablanca Stock Exchange listed companies — import official Fiche Instrument PDFs to analyze stock performance and generate JEV AI investment judgments.",
};

export default function CompaniesPage() {
  return (
    <div className="w-full bg-white text-zinc-900 font-sans">
      <CompanySearch />
    </div>
  );
}
