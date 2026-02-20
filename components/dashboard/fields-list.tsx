'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { fetchFields } from '@/lib/john-deere-client';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import type { JohnDeereField } from '@/types/john-deere';

export function FieldsList() {
  const { johnDeereConnection } = useAuth();
  const [fields, setFields] = useState<JohnDeereField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (johnDeereConnection?.selected_org_id) {
      loadFields();
    }
  }, [johnDeereConnection?.selected_org_id]);

  const loadFields = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchFields();
      setFields(data.values || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setIsLoading(false);
    }
  };

  if (!johnDeereConnection?.selected_org_id) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Select an organization to view fields</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Fields</h3>
            <p className="text-sm text-slate-500">{fields.length} fields in this organization</p>
          </div>
        </div>
        <Button onClick={loadFields} variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {isLoading && fields.length === 0 ? (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Loading fields...</p>
        </div>
      ) : error ? (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      ) : fields.length === 0 ? (
        <div className="p-8 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No fields found in this organization</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {fields.map((field) => (
            <div key={field.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{field.name}</p>
                  <p className="text-sm text-slate-500">ID: {field.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
