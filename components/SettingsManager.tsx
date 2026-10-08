"use client";

import { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  HelpCircle,
  Cpu,
  FileText,
} from "lucide-react";

export interface ProviderStatus {
  provider: "jev";
  displayName: string;
  isConfigured: boolean;
  maskedKey: string | null;
  configuredAt: string | null;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
}

interface MessageState {
  type: "success" | "error" | "info";
  text: string;
}

interface ProviderCardProps {
  provider: "jev";
  title: string;
  roleDescription: string;
  purposeNote: string;
  icon: React.ReactNode;
  status: ProviderStatus | undefined;
  onRefreshStatus: () => Promise<void>;
  onStatusChange?: (provider: "jev", isConfigured: boolean) => void;
}

function ProviderCard({
  provider,
  title,
  roleDescription,
  purposeNote,
  icon,
  status,
  onRefreshStatus,
  onStatusChange,
}: ProviderCardProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  const isConfigured = status?.isConfigured ?? false;
  const maskedKey = status?.maskedKey ?? null;

  // Clear message after 8 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSave = async () => {
    setMessage(null);

    if (!apiKeyInput || apiKeyInput.trim() === "") {
      setMessage({
        type: "error",
        text: "Missing key: Please enter an API key before saving.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKeyInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: "error",
          text: data.error || `Save failure: Failed to save ${title} key.`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Success: ${title} API key saved securely.`,
        });
        setApiKeyInput(""); // Clear the input field so raw key is never displayed again
        await onRefreshStatus();
        if (onStatusChange) onStatusChange(provider, true);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: `Save failure: ${(err as Error).message || "Network error while saving."}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setMessage(null);

    const keyToTest = apiKeyInput.trim();
    if (!keyToTest && !isConfigured) {
      setMessage({
        type: "error",
        text: "Missing key: Please enter an API key to test the connection.",
      });
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: keyToTest || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: data.message || `Connection test successful: ${title} responded OK.`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.message || data.error || `Connection test failed: Unable to connect to ${title}.`,
        });
      }
      await onRefreshStatus();
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: `Connection test failed: ${(err as Error).message || "Could not reach server."}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemove = async () => {
    if (!isConfigured) return;

    if (!confirm(`Are you sure you want to remove the configured ${title} API key?`)) {
      return;
    }

    setMessage(null);
    setIsRemoving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({
          type: "error",
          text: data.error || `Failed to remove ${title} key.`,
        });
      } else {
        setMessage({
          type: "info",
          text: `${title} API key has been removed.`,
        });
        setApiKeyInput("");
        await onRefreshStatus();
        if (onStatusChange) onStatusChange(provider, false);
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: `Remove failure: ${(err as Error).message || "Failed to remove key."}`,
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs hover:border-zinc-300 transition-all">
      {/* Provider Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-100">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">{title}</h2>
              {/* Configuration Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isConfigured
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConfigured ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                  }`}
                />
                {isConfigured ? "Configured" : "Not configured"}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">{roleDescription}</p>
          </div>
        </div>

        {/* Display Masked Key if configured */}
        <div className="sm:text-right shrink-0">
          <div className="text-xs text-zinc-500 font-medium">Current Status</div>
          <div className="font-mono text-xs font-semibold mt-0.5 text-zinc-800">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200 text-zinc-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {maskedKey || "Configured"}
              </span>
            ) : (
              <span className="text-zinc-600 italic">No key configured</span>
            )}
          </div>
          {status?.configuredAt && (
            <div className="text-[10px] text-zinc-600 mt-1">
              Configured: {status.configuredAt.startsWith("20") ? new Date(status.configuredAt).toLocaleDateString() : status.configuredAt}
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            {isConfigured ? "Update API Key" : "Enter API Key"}
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                isConfigured
                  ? `Key is active (${maskedKey || "Configured"}). Enter new key to update...`
                  : `Paste ${title} API key here...`
              }
              className="w-full font-mono text-sm px-3.5 py-2.5 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder:text-zinc-600 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all pr-10"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5 transition-colors"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 shrink-0" />
            {purposeNote}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isTesting || isRemoving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {isConfigured ? "Update & Save" : "Save Key"}
          </button>

          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isSaving || isTesting || isRemoving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 disabled:opacity-50 text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                Testing Live Connection...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-zinc-600" />
                Test Connection
              </>
            )}
          </button>

          {/* Remove Button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={!isConfigured || isSaving || isTesting || isRemoving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-600 text-xs font-medium rounded-lg border border-transparent hover:border-red-200 transition-colors cursor-pointer disabled:cursor-not-allowed ml-auto"
            title="Remove stored API key"
          >
            {isRemoving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Remove Key
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : message.type === "error"
                ? "bg-red-50 text-red-900 border-red-200"
                : "bg-blue-50 text-blue-900 border-blue-200"
            }`}
          >
            {message.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {message.type === "error" && (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            {message.type === "info" && (
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-relaxed">{message.text}</div>
          </div>
        )}

        {/* Previous test status badge if available and no active alert */}
        {!message && status?.lastTestedAt && (
          <div className="text-[11px] text-zinc-600 pt-1 flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status.lastTestSuccess ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span>
              Last connection test:{" "}
              <strong className={status.lastTestSuccess ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                {status.lastTestSuccess ? "Passed" : "Failed"}
              </strong>{" "}
              ({new Date(status.lastTestedAt).toLocaleTimeString()}) — {status.lastTestMessage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SettingsManager({
  onStatusUpdate,
}: {
  onStatusUpdate?: (jevConfigured: boolean) => void;
}) {
  const [statuses, setStatuses] = useState<{
    jev?: ProviderStatus;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setStatuses(json.data);
        if (onStatusUpdate) {
          onStatusUpdate(!!json.data.jev?.isConfigured);
        }
      } else {
        setFetchError(json.error || "Failed to load API settings");
      }
    } catch (err: unknown) {
      setFetchError((err as Error).message || "Could not reach configuration service");
    } finally {
      setIsLoading(false);
    }
  }, [onStatusUpdate]);

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (ignore) return;
        if (json.success && json.data) {
          setStatuses(json.data);
          onStatusUpdate?.(!!json.data.jev?.isConfigured);
        } else {
          setFetchError(json.error || "Failed to load API settings");
        }
      } catch (err: unknown) {
        if (!ignore) {
          setFetchError((err as Error).message || "Could not reach configuration service");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      ignore = true;
    };
  }, [onStatusUpdate]);

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-8 pb-6 border-b border-zinc-200">
        <div className="flex items-center gap-2.5 text-zinc-900 mb-1">
          <KeyRound className="w-5 h-5 text-zinc-700" />
          <h1 className="text-2xl font-bold tracking-tight">API Key Settings</h1>
        </div>
        <p className="text-sm text-zinc-600 mt-1">
          Configure external AI decision engine credentials. Stock quotes and financial reports are imported exclusively via official Casablanca Stock Exchange PDFs.
        </p>
        <div className="mt-3 text-xs bg-emerald-50/80 border border-emerald-200 text-emerald-900 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>PDF-Only Stock Data:</strong> Stock prices, 5-year financials, balance sheets, and dividends are imported directly from Casablanca Stock Exchange Fiche Instrument PDFs without requiring external stock APIs. Configure JEV AI below for investment recommendations.
          </span>
        </div>
        <div className="mt-2 text-xs bg-zinc-50 border border-zinc-200 text-zinc-600 p-3 rounded-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            API keys are securely stored on the server, never hard-coded, and never re-displayed in full once saved.
          </span>
        </div>
      </div>

      {fetchError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
          Loading configuration status...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Data Source Notice */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-800 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-900">Stock & Financial Data Source</h2>
              <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                Imported directly via official Casablanca Stock Exchange Fiche Instrument PDFs (&ldquo;Fiche Émetteur&rdquo; format). No external market data API or API key is required for stock quotes and financials.
              </p>
            </div>
          </div>

          {/* JEV AI Section */}
          <ProviderCard
            provider="jev"
            title="JEV AI"
            roleDescription="Discriminative decision engine responsible for BUY / HOLD / SELL judgments, confidence, and scores."
            purposeNote="Accepts clean structured JSON containing fundamental, technical, and dividend data extracted from uploaded PDFs."
            icon={<Cpu className="w-5 h-5 text-zinc-800" />}
            status={statuses.jev}
            onRefreshStatus={fetchStatuses}
          />
        </div>
      )}
    </div>
  );
}
