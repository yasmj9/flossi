import { NextRequest, NextResponse } from "next/server";
import { testProviderConnection, Provider } from "@/lib/api-keys";

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

    const result = await testProviderConnection(provider as Provider, apiKey);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      statusCode: result.statusCode,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: `Test connection error: ${(err as Error).message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
