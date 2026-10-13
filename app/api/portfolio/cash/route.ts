import { NextRequest, NextResponse } from 'next/server';
import { recordCash } from '@/lib/portfolioStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cash = recordCash(body);
    return NextResponse.json(cash, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l’enregistrement du mouvement de liquidité.' },
      { status: 500 }
    );
  }
}
