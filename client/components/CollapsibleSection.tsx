'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  countLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  countLabel,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
            {countLabel && (
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                ({countLabel})
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-slate-700' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100">
          {children}
        </div>
      )}
    </section>
  );
}
