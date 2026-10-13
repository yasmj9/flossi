import { NextResponse } from 'next/server';

const INITIAL_COMPANIES = [
  { id: 'akt', ticker: 'AKT', name: 'Akdital', sector: 'Santé & pharmacie', description: 'Leader de la santé privée au Maroc' },
  { id: 'lbv', ticker: 'LBV', name: 'LabelVie', sector: 'Biens de consommation & agroalimentaire', description: 'Distribution alimentaire et supermarchés' },
  { id: 'mng', ticker: 'MNG', name: 'Managem', sector: 'Mines & métaux', description: 'Groupe minier panafricain' },
  { id: 'iam', ticker: 'IAM', name: 'Maroc Telecom', sector: 'Télécommunications', description: 'Opérateur télécom historique' },
];

export async function GET() {
  return NextResponse.json(INITIAL_COMPANIES);
}
