'use client';

import React, { useRef } from 'react';
import { Save, RotateCcw, Download, Upload } from 'lucide-react';
import { FinancialChecklistData } from '@/lib/types';
import { validateImportedData } from '@/lib/storage';

interface HeaderActionsProps {
  data: FinancialChecklistData;
  onSave: () => void;
  onReset: () => void;
  onImport: (newData: FinancialChecklistData) => void;
  onShowMessage: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function HeaderActions({
  data,
  onSave,
  onReset,
  onImport,
  onShowMessage,
}: HeaderActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const company = data.stockInfo.ticker || data.stockInfo.companyName || 'societe';
      const safeName = company.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `analyse_${safeName}_${dateStr}.json`;

      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onShowMessage('Export JSON téléchargé avec succès.', 'success');
    } catch {
      onShowMessage("Échec de l'export JSON.", 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const validation = validateImportedData(parsed);

        if (validation.valid && validation.data) {
          onImport(validation.data);
          onShowMessage('Analyse importée avec succès !', 'success');
        } else {
          onShowMessage(validation.error || 'Fichier JSON non conforme.', 'error');
        }
      } catch {
        onShowMessage('Erreur de lecture du fichier JSON (syntaxe invalide).', 'error');
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <button
        type="button"
        onClick={onSave}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
      >
        <Save className="w-3.5 h-3.5" />
        Enregistrer
      </button>

      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Exporter JSON
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
      >
        <Upload className="w-3.5 h-3.5" />
        Importer JSON
      </button>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('Voulez-vous réinitialiser tous les champs de la checklist ?')) {
            onReset();
          }
        }}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Réinitialiser
      </button>
    </div>
  );
}
