import { NextRequest, NextResponse } from 'next/server';

interface DecisionSnapshot {
  id: string;
  portfolioId: string;
  evaluationDate: string;
  reportSummary: any;
  createdAt: string;
}

// In-memory snapshots cache for session/server persistence
const memorySnapshots: DecisionSnapshot[] = [];

export async function GET() {
  return NextResponse.json(memorySnapshots);
}

export async function POST(req: NextRequest) {
  try {
    const reportData = await req.json();
    const snapshot: DecisionSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      portfolioId: 'default-portfolio',
      evaluationDate: reportData?.evaluationDate || new Date().toISOString().split('T')[0],
      reportSummary: reportData,
      createdAt: new Date().toISOString(),
    };

    memorySnapshots.unshift(snapshot);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la sauvegarde du snapshot.' },
      { status: 500 }
    );
  }
}
