import { NextRequest, NextResponse } from 'next/server';
import { evaluateMonthlyDecisionsEngine } from '@/lib/decisionsEngine';

export async function GET() {
  try {
    const report = evaluateMonthlyDecisionsEngine();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l’évaluation des décisions.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { criteria, clientSavedCompanies, portfolio } = body;
    const report = evaluateMonthlyDecisionsEngine(criteria, clientSavedCompanies, portfolio);
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l’évaluation des décisions.' },
      { status: 500 }
    );
  }
}
