import { promises as fs } from "fs";
import path from "path";

export type Provider = "parsebot" | "jev";

export interface ProviderStatus {
  provider: Provider;
  displayName: string;
  isConfigured: boolean;
  maskedKey: string | null;
  configuredAt: string | null;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  lastTestMessage: string | null;
}

export interface StoredProviderData {
  key: string;
  masked: string;
  configuredAt: string;
  lastTestedAt?: string;
  lastTestSuccess?: boolean;
  lastTestMessage?: string;
}

export type StorageData = Partial<Record<Provider, StoredProviderData>>;

const STORAGE_FILE_PATH = path.join(process.cwd(), "data", "api-keys.json");

/**
 * Ensures data directory exists and reads stored configuration
 */
async function readStorage(): Promise<StorageData> {
  try {
    const content = await fs.readFile(STORAGE_FILE_PATH, "utf-8");
    return JSON.parse(content) as StorageData;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    // If invalid JSON, treat as empty
    return {};
  }
}

/**
 * Writes data safely to storage file
 */
async function writeStorage(data: StorageData): Promise<void> {
  const dirPath = path.dirname(STORAGE_FILE_PATH);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(STORAGE_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Masks an API key for safe display (e.g. ••••••••AB12)
 */
export function maskApiKey(key: string): string {
  if (!key) return "";
  const trimmed = key.trim();
  if (trimmed.length > 6) {
    const lastFour = trimmed.slice(-4);
    return `••••••••${lastFour}`;
  }
  return "••••••••";
}

/**
 * Reusable server-side helper to read an active API key.
 * Checks persistent storage first, then falls back to process.env.
 * 
 * Usage:
 * const omkarKey = await getApiKey('omkar');
 * const jevKey = await getApiKey('jev');
 */
export async function getApiKey(provider: Provider): Promise<string | null> {
  try {
    const storage = await readStorage();
    const stored = storage[provider];
    if (stored?.key && stored.key.trim().length > 0) {
      return stored.key.trim();
    }
  } catch {
    // If storage read fails, continue to environment variable check
  }

  // Fallback to environment variables if provided
  if (provider === "parsebot") {
    return process.env.PARSE_API_KEY?.trim() || null;
  } else if (provider === "jev") {
    return process.env.JEV_API_KEY?.trim() || null;
  }

  return null;
}

/**
 * Returns configuration status for all supported providers.
 * Never exposes the full raw key.
 */
export async function getApiKeysStatus(): Promise<Record<Provider, ProviderStatus>> {
  const storage = await readStorage();

  const providers: { id: Provider; displayName: string; envFallback: string | undefined }[] = [
    { id: "parsebot", displayName: "Parse.bot API", envFallback: process.env.PARSE_API_KEY },
    { id: "jev", displayName: "JEV AI", envFallback: process.env.JEV_API_KEY },
  ];

  const result: Record<Provider, ProviderStatus> = {
    parsebot: {
      provider: "parsebot",
      displayName: "Parse.bot API",
      isConfigured: false,
      maskedKey: null,
      configuredAt: null,
      lastTestedAt: null,
      lastTestSuccess: null,
      lastTestMessage: null,
    },
    jev: {
      provider: "jev",
      displayName: "JEV AI",
      isConfigured: false,
      maskedKey: null,
      configuredAt: null,
      lastTestedAt: null,
      lastTestSuccess: null,
      lastTestMessage: null,
    },
  };

  for (const p of providers) {
    const stored = storage[p.id];
    const envVal = p.envFallback?.trim();

    if (stored?.key) {
      result[p.id] = {
        provider: p.id,
        displayName: p.displayName,
        isConfigured: true,
        maskedKey: stored.masked || maskApiKey(stored.key),
        configuredAt: stored.configuredAt,
        lastTestedAt: stored.lastTestedAt ?? null,
        lastTestSuccess: stored.lastTestSuccess ?? null,
        lastTestMessage: stored.lastTestMessage ?? null,
      };
    } else if (envVal) {
      result[p.id] = {
        provider: p.id,
        displayName: p.displayName,
        isConfigured: true,
        maskedKey: maskApiKey(envVal),
        configuredAt: "Environment Variable",
        lastTestedAt: null,
        lastTestSuccess: null,
        lastTestMessage: null,
      };
    } else {
      result[p.id] = {
        provider: p.id,
        displayName: p.displayName,
        isConfigured: false,
        maskedKey: null,
        configuredAt: null,
        lastTestedAt: stored?.lastTestedAt ?? null,
        lastTestSuccess: stored?.lastTestSuccess ?? null,
        lastTestMessage: stored?.lastTestMessage ?? null,
      };
    }
  }

  return result;
}

/**
 * Saves an API key for the specified provider into persistent storage.
 */
export async function saveApiKey(
  provider: Provider,
  rawKey: string
): Promise<{ success: boolean; maskedKey: string }> {
  if (!rawKey || typeof rawKey !== "string" || rawKey.trim().length === 0) {
    throw new Error("Missing API key. Please provide a valid key string.");
  }

  const cleanKey = rawKey.trim();
  const masked = maskApiKey(cleanKey);

  const storage = await readStorage();
  const existing = storage[provider];

  storage[provider] = {
    key: cleanKey,
    masked,
    configuredAt: new Date().toISOString(),
    lastTestedAt: existing?.lastTestedAt,
    lastTestSuccess: existing?.lastTestSuccess,
    lastTestMessage: existing?.lastTestMessage,
  };

  await writeStorage(storage);
  return { success: true, maskedKey: masked };
}

/**
 * Removes the configured API key for a provider.
 */
export async function removeApiKey(provider: Provider): Promise<{ success: boolean }> {
  const storage = await readStorage();
  if (storage[provider]) {
    delete storage[provider];
    await writeStorage(storage);
  }
  return { success: true };
}

/**
 * Tests connection to the provider using either a given key or the saved key.
 * Uses real API endpoints with no mocking or fabricated success states.
 */
export async function testProviderConnection(
  provider: Provider,
  keyToTest?: string
): Promise<{ success: boolean; message: string; statusCode?: number }> {
  let activeKey = keyToTest?.trim();

  // If no key was supplied in the test request, use stored key
  if (!activeKey) {
    const stored = await getApiKey(provider);
    if (stored) {
      activeKey = stored;
    }
  }

  if (!activeKey) {
    return {
      success: false,
      message: "Missing API key: Please enter an API key or configure one first.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    if (provider === "parsebot") {
      // Parse.bot live API test:
      // Calls Parse.bot marketplace search endpoint which validates X-API-Key
      const res = await fetch("https://api.parse.bot/marketplace/apis?q=stock", {
        method: "GET",
        headers: {
          "X-API-Key": activeKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: Record<string, unknown> | null = null;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        // Response was not JSON
      }

      if (res.ok) {
        await updateTestStatus(provider, true, "Connection successful. Parse.bot API validated the key.");
        return {
          success: true,
          statusCode: res.status,
          message: "Connection successful. Parse.bot accepted and validated the API key.",
        };
      }

      const errMsg =
        (data?.error as string) ||
        (data?.detail as string) ||
        (data?.message as string) ||
        res.statusText;

      let failureReason = `Connection failed (${res.status}): ${errMsg || "Authentication error"}`;

      if (res.status === 401) {
        failureReason = `Invalid API key (401): ${errMsg || "Parse.bot rejected the key as unauthorized. Get a key at https://parse.bot"}`;
      } else if (res.status === 403) {
        failureReason = `Access forbidden (403): ${errMsg || "Parse.bot access forbidden."}`;
      }

      await updateTestStatus(provider, false, failureReason);
      return {
        success: false,
        statusCode: res.status,
        message: failureReason,
      };
    } else if (provider === "jev") {
      // JEV AI live API test:
      // Uses TypeSafe AI / JEV AI systemone endpoint with Authorization Bearer header
      const testPayload = {
        model: "jev-latest",
        state: {
          test: "connection_ping",
          service: "JEV AI",
          market: "Casablanca Stock Exchange",
          timestamp: new Date().toISOString(),
        },
        questions: {
          connection_status: {
            type: "choice",
            instructions: "Is this API connection test received successfully?",
            criteria: {
              YES: "The connection ping is valid and operational",
              NO: "The connection ping failed",
            },
          },
        },
      };

      const res = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: Record<string, unknown> | null = null;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        // Not JSON
      }

      if (res.ok) {
        await updateTestStatus(provider, true, "Connection successful. JEV AI validated the key.");
        return {
          success: true,
          statusCode: res.status,
          message: "Connection successful. JEV AI accepted and validated the API key.",
        };
      }

      let detailMsg = res.statusText;
      if (data) {
        if (Array.isArray(data.detail)) {
          detailMsg = (data.detail as Array<{ msg?: string; loc?: string[] }>)
            .map((d) => (d.loc ? `${d.loc.slice(-1)[0]}: ${d.msg}` : d.msg || "Validation error"))
            .join("; ");
        } else if (typeof data.detail === "object" && data.detail !== null) {
          const detailObj = data.detail as Record<string, unknown>;
          detailMsg = (detailObj.message as string) || (detailObj.error as string) || JSON.stringify(data.detail);
        } else if (typeof data.detail === "string") {
          detailMsg = data.detail;
        } else if (typeof data.message === "string") {
          detailMsg = data.message;
        } else if (typeof data.error === "string") {
          detailMsg = data.error;
        }
      }

      let failureReason = `Connection failed (${res.status}): ${detailMsg || "Invalid request."}`;

      if (res.status === 401) {
        failureReason = `Invalid API key (401): ${detailMsg || "JEV AI rejected the key as unauthorized."}`;
      } else if (res.status === 403) {
        failureReason = `Access forbidden (403): ${detailMsg || "JEV AI access forbidden."}`;
      } else if (res.status === 400) {
        if (detailMsg?.toLowerCase().includes("invalid api key") || detailMsg?.toLowerCase().includes("unauthorized") || detailMsg?.toLowerCase().includes("api key")) {
          failureReason = `Invalid API key (400): ${detailMsg}`;
        } else {
          failureReason = `Connection failed (${res.status}): ${detailMsg || "Invalid request."}`;
        }
      }

      await updateTestStatus(provider, false, failureReason);
      return {
        success: false,
        statusCode: res.status,
        message: failureReason,
      };
    }

    return {
      success: false,
      message: `Unknown provider: ${provider}`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg =
      (err as Error).name === "AbortError"
        ? "Connection timed out after 10 seconds."
        : `Network error: ${(err as Error).message || "Unable to reach server"}`;

    await updateTestStatus(provider, false, errorMsg);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Updates stored test status if provider already has a stored configuration
 */
async function updateTestStatus(
  provider: Provider,
  success: boolean,
  message: string
): Promise<void> {
  try {
    const storage = await readStorage();
    if (storage[provider]) {
      storage[provider]!.lastTestedAt = new Date().toISOString();
      storage[provider]!.lastTestSuccess = success;
      storage[provider]!.lastTestMessage = message;
      await writeStorage(storage);
    }
  } catch {
    // Non-critical, ignore
  }
}
