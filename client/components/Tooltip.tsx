'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { FieldTooltip } from '@/lib/tooltips';

interface TooltipProps {
  info?: FieldTooltip;
}

export function Tooltip({ info }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!info) return null;

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`En savoir plus sur ${info.title}`}
        className="p-1 text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute z-40 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 sm:w-80 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-800 mb-2">
            <span className="font-semibold text-slate-100">{info.title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-300 leading-relaxed mb-2">{info.description}</p>
          <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60 text-slate-200">
            <span className="font-medium text-emerald-400 block mb-0.5 text-[11px] uppercase tracking-wider">
              Exemple en MAD
            </span>
            <p className="text-slate-300 leading-snug">{info.example}</p>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}
