'use client';

import { Ruler } from 'lucide-react';

interface AreaUnitToggleProps {
  value: string;
  onChange: (unit: string) => void;
}

export function AreaUnitToggle({ value, onChange }: AreaUnitToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Ruler className="w-4 h-4 text-slate-400" />
      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
        <button
          onClick={() => onChange('ac')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === 'ac'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Acres
        </button>
        <button
          onClick={() => onChange('ha')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === 'ha'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hectares
        </button>
      </div>
    </div>
  );
}
