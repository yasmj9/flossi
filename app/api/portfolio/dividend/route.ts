import { NextRequest, NextResponse } from 'next/server';
import { recordDividend } from '@/lib/portfolioStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const div = recordDividend(body);
    return NextResponse.json(div, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l’enregistrement du dividende.' },
      { status: 500 }
    );
  }
}
