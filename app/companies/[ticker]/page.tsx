import { Metadata } from "next";
import { CompanyOverview } from "@/components/CompanyOverview";
import { getCseCompany } from "@/lib/cse-companies";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const company = getCseCompany(ticker);
  return {
    title: company
      ? `${company.name} (${company.ticker}) — Flossi`
      : `${ticker.toUpperCase()} — Flossi`,
    description: company
      ? `Stock overview for ${company.name} (${company.ticker}) on the Casablanca Stock Exchange.`
      : `Stock overview for ${ticker} on the Casablanca Stock Exchange.`,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return <CompanyOverview ticker={ticker} />;
}
