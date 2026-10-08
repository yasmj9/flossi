import { Metadata } from "next";
import { SettingsManager } from "@/components/SettingsManager";

export const metadata: Metadata = {
  title: "Settings & API Keys — Flossi",
  description: "Configure Parse.bot API and JEV AI API keys for Casablanca Stock Exchange analysis.",
};

export default function SettingsPage() {
  return (
    <div className="w-full bg-white text-zinc-900 font-sans">
      <SettingsManager />
    </div>
  );
}
