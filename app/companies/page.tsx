import { Metadata } from "next";
import { CompanySearch } from "@/components/CompanySearch";

export const metadata: Metadata = {
  title: "Companies — Casablanca Stock Exchange",
  description: "Search and select companies listed on the Casablanca Stock Exchange (BVC).",
};

export default function CompaniesPage() {
  return (
    <div className="w-full bg-white text-zinc-900 font-sans">
      <CompanySearch />
    </div>
  );
}
