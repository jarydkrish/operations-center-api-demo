'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { fetchHarvestOperations } from '@/lib/john-deere-client';
import { Button } from '@/components/ui/button';
import { Loader2, Wheat, RefreshCw, Calendar, Droplets } from 'lucide-react';

interface HarvestOperation {
  id: string;
  type: string;
  startDate: string;
  endDate?: string;
  crop?: { name: string };
  variety?: { name: string };
  harvestMoisture?: number;
  totalYield?: { value: number; unit: string };
}

interface FieldOperations {
  fieldId: string;
  fieldName: string;
  operations: HarvestOperation[];
}

export function HarvestOperations() {
  const { johnDeereConnection } = useAuth();
  const [fieldOperations, setFieldOperations] = useState<FieldOperations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (johnDeereConnection?.selected_org_id) {
      loadHarvestOperations();
    }
  }, [johnDeereConnection?.selected_org_id]);

  const loadHarvestOperations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchHarvestOperations();
      setFieldOperations(data.values || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load harvest operations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const totalOperations = fieldOperations.reduce((sum, fo) => sum + fo.operations.length, 0);

  if (!johnDeereConnection?.selected_org_id) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-8">
          <Wheat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Select an organization to view harvest operations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Wheat className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Harvest Operations</h3>
            <p className="text-sm text-slate-500">
              {totalOperations} operations across {fieldOperations.length} fields
            </p>
          </div>
        </div>
        <Button onClick={loadHarvestOperations} variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {isLoading && fieldOperations.length === 0 ? (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Loading harvest operations...</p>
          <p className="text-xs text-slate-400 mt-1">This may take a moment as we fetch data for all fields</p>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      ) : fieldOperations.length === 0 || totalOperations === 0 ? (
        <div className="p-8 text-center">
          <Wheat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No harvest operations found</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {fieldOperations.map((fo) =>
            fo.operations.length > 0 ? (
              <div key={fo.fieldId} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium text-slate-900">{fo.fieldName}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {fo.operations.length} operation{fo.operations.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {fo.operations.map((op) => (
                    <div
                      key={op.id}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-100"
                    >
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {op.crop?.name && (
                          <div className="flex items-center gap-1.5">
                            <Wheat className="w-4 h-4 text-amber-600" />
                            <span className="text-slate-700">{op.crop.name}</span>
                          </div>
                        )}
                        {op.startDate && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="text-slate-700">{formatDate(op.startDate)}</span>
                          </div>
                        )}
                        {op.harvestMoisture !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <Droplets className="w-4 h-4 text-cyan-600" />
                            <span className="text-slate-700">{op.harvestMoisture}% moisture</span>
                          </div>
                        )}
                        {op.totalYield && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 font-medium">
                              {op.totalYield.value.toLocaleString()} {op.totalYield.unit}
                            </span>
                          </div>
                        )}
                      </div>
                      {op.variety?.name && (
                        <p className="text-xs text-slate-500 mt-2">Variety: {op.variety.name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
