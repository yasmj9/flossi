import { NextRequest, NextResponse } from "next/server";
import {
  getApiKeysStatus,
  saveApiKey,
  removeApiKey,
  Provider,
} from "@/lib/api-keys";

export async function GET() {
  try {
    const status = await getApiKeysStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey } = body as { provider?: string; apiKey?: string };

    const validProviders: Provider[] = ["drahmi", "omkar", "jev"];
    if (!provider || !validProviders.includes(provider as Provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider specified. Must be 'drahmi', 'omkar', or 'jev'." },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing API key: Please enter an API key before saving." },
        { status: 400 }
      );
    }

    const providerNames: Record<Provider, string> = {
      drahmi: "Drahmi API",
      omkar: "Omkar Cloud",
      jev: "JEV AI",
    };

    const result = await saveApiKey(provider as Provider, apiKey);
    return NextResponse.json({
      success: true,
      message: `${providerNames[provider as Provider] || provider} API key saved successfully.`,
      maskedKey: result.maskedKey,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: `Save failure: ${(err as Error).message || "Failed to save API key"}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider } = body as { provider?: string };

    const validProviders: Provider[] = ["drahmi", "omkar", "jev"];
    if (!provider || !validProviders.includes(provider as Provider)) {
      return NextResponse.json(
        { success: false, error: "Invalid provider specified. Must be 'drahmi', 'omkar', or 'jev'." },
        { status: 400 }
      );
    }

    const providerNames: Record<Provider, string> = {
      drahmi: "Drahmi API",
      omkar: "Omkar Cloud",
      jev: "JEV AI",
    };

    await removeApiKey(provider as Provider);
    return NextResponse.json({
      success: true,
      message: `${providerNames[provider as Provider] || provider} API key removed successfully.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: `Remove failure: ${(err as Error).message || "Failed to remove API key"}`,
      },
      { status: 500 }
    );
  }
}
