'use client';

import React from 'react';
import { Tooltip } from './Tooltip';
import { FieldTooltip } from '@/lib/tooltips';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  tooltip?: FieldTooltip;
  required?: boolean;
  type?: 'text' | 'number';
  suffix?: string;
  error?: string;
  step?: string;
  disabled?: boolean;
  helperText?: string;
}

export function FormField({
  id,
  label,
  value,
  onChange,
  placeholder = '0.00',
  tooltip,
  required = false,
  type = 'text',
  suffix,
  error,
  disabled = false,
  helperText,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <label htmlFor={id} className="cursor-pointer">
            {label}
          </label>
          {required ? (
            <span className="text-rose-500 font-semibold" title="Champ requis">
              *
            </span>
          ) : (
            <span className="text-slate-400 font-normal text-[11px]">(optionnel)</span>
          )}
          {tooltip && <Tooltip info={tooltip} />}
        </div>
      </div>

      <div className="relative rounded-lg shadow-2xs">
        <input
          id={id}
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 transition-colors focus:outline-none focus:ring-2 tabular-nums ${
            error
              ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
              : 'border-slate-300 focus:border-slate-800 focus:ring-slate-200'
          } ${suffix ? 'pr-12' : ''} disabled:bg-slate-50 disabled:text-slate-400`}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-slate-600 font-medium select-none">
            {suffix}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-600 font-medium leading-tight">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-tight">{helperText}</p>
      ) : null}
    </div>
  );
}
