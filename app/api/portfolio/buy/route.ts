import { NextRequest, NextResponse } from 'next/server';
import { recordBuyTransaction } from '@/lib/portfolioStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tx = recordBuyTransaction(body);
    return NextResponse.json(tx, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l’enregistrement de l’achat.' },
      { status: 500 }
    );
  }
}
