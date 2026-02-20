'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { fetchOrganizations, selectOrganization } from '@/lib/john-deere-client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Building2, Check } from 'lucide-react';
import type { JohnDeereOrganization } from '@/types/john-deere';

interface OrganizationSelectorProps {
  onOrganizationChange?: () => void;
}

export function OrganizationSelector({ onOrganizationChange }: OrganizationSelectorProps) {
  const { johnDeereConnection, refreshJohnDeereConnection } = useAuth();
  const [organizations, setOrganizations] = useState<JohnDeereOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (johnDeereConnection) {
      loadOrganizations();
      if (johnDeereConnection.selected_org_id) {
        setSelectedOrgId(johnDeereConnection.selected_org_id);
      }
    }
  }, [johnDeereConnection]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizations();
      setOrganizations(data.values || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedOrgId) return;

    const org = organizations.find((o) => o.id === selectedOrgId);
    if (!org) return;

    setIsSaving(true);
    try {
      await selectOrganization(org.id, org.name);
      await refreshJohnDeereConnection();
      onOrganizationChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save organization');
    } finally {
      setIsSaving(false);
    }
  };

  if (!johnDeereConnection) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          <span className="text-slate-600">Loading organizations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <Button onClick={loadOrganizations} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Select Organization</h3>
          <p className="text-sm text-slate-500">Choose which organization's data to view</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select an organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleSave}
          disabled={!selectedOrgId || isSaving || selectedOrgId === johnDeereConnection.selected_org_id}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {organizations.length === 0 && (
        <p className="text-sm text-slate-500 mt-3">No organizations found in your account.</p>
      )}
    </div>
  );
}
