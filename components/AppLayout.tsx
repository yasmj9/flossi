"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  KeyRound,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileUp,
  FileText,
} from "lucide-react";
import { ImportPdfModal } from "./ImportPdfModal";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [jevConfigured, setJevConfigured] = useState(false);

  // Fetch API keys status for the sidebar indicators
  useEffect(() => {
    let ignore = false;
    async function checkStatus() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (ignore) return;
        if (json.success && json.data) {
          setJevConfigured(!!json.data.jev?.isConfigured);
        }
      } catch {
        // silent
      }
    }
    void checkStatus();
    return () => {
      ignore = true;
    };
  }, [pathname]);

  // Handle ESC key for mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    {
      href: "/companies",
      label: "Import PDF",
      icon: FileUp,
      exact: true,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: KeyRound,
      exact: false,
    },
  ];

  const isLinkActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col md:flex-row antialiased">
      {/* ============================================================== */}
      {/* MOBILE DRAWER BACKDROP & DRAWER */}
      {/* ============================================================== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-zinc-200 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              FL
            </div>
            <div>
              <span className="font-semibold text-zinc-900 text-sm tracking-tight">FLOSSI</span>
              <p className="text-[10px] text-zinc-500">Casablanca Stock Exchange</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <nav className="p-4 flex-1 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-100 text-zinc-900 font-semibold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-zinc-900" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Sidebar Footer with Provider Statuses */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 space-y-2">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Data Source
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              Fiche Émetteur (PDF)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              PDF-First
            </span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-1.5 text-zinc-700">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              JEV AI
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                jevConfigured ? "text-emerald-700" : "text-zinc-600"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  jevConfigured ? "bg-emerald-500" : "bg-zinc-300"
                }`}
              />
              {jevConfigured ? "Ready" : "Unset"}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR */}
      {/* ============================================================== */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-zinc-200 shrink-0 transition-all duration-200 ease-in-out relative ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-4 border-b border-zinc-200 flex items-center justify-between">
          <Link href="/companies" className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-xs">
              FL
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-semibold text-zinc-900 text-sm tracking-tight block">
                  FLOSSI
                </span>
                <span className="text-[10px] text-zinc-500 block -mt-0.5 truncate">
                  Casablanca Stock Exchange
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-zinc-100 text-zinc-900 font-semibold"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-zinc-900" : "text-zinc-500"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Integrations Indicator on Desktop */}
        {!collapsed ? (
          <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 space-y-2">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Data Pipeline
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-700 flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-zinc-500" />
                Fiche Émetteur (PDF)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                PDF-First
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-700 flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-zinc-500" />
                JEV AI
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  jevConfigured ? "text-emerald-700" : "text-zinc-600"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    jevConfigured ? "bg-emerald-500" : "bg-zinc-300"
                  }`}
                />
                {jevConfigured ? "Configured" : "Unset"}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-zinc-200 flex flex-col items-center gap-2">
            <span
              className="w-2 h-2 rounded-full bg-emerald-500"
              title="Fiche Émetteur: PDF-First"
            />
            <span
              className={`w-2 h-2 rounded-full ${jevConfigured ? "bg-emerald-500" : "bg-zinc-300"}`}
              title={`JEV AI: ${jevConfigured ? "Configured" : "Not configured"}`}
            />
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="p-2 border-t border-zinc-200 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 p-1.5 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs text-zinc-600">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Mobile Top Bar */}
        <header className="h-14 md:hidden border-b border-zinc-200 px-4 flex items-center justify-between bg-white sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -ml-1 rounded-md text-zinc-700 hover:bg-zinc-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-sm text-zinc-900 tracking-tight">FLOSSI</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              BVC
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Import PDF</span>
            </button>

            <Link
              href="/settings"
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900"
              title="Settings"
            >
              <KeyRound className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 bg-white">{children}</div>

        {/* Global Import PDF Modal */}
        <ImportPdfModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      </div>
    </div>
  );
}
