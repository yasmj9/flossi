import { NextResponse } from 'next/server';
import { getPortfolioData } from '@/lib/portfolioStore';

export async function GET() {
  try {
    const data = getPortfolioData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération du portefeuille.' },
      { status: 500 }
    );
  }
}
