'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getJohnDeereAuthUrl, disconnectJohnDeere } from '@/lib/john-deere-client';
import { Button } from '@/components/ui/button';
import { Loader2, Link2, Unlink, CheckCircle2 } from 'lucide-react';

export function JohnDeereConnect() {
  const { johnDeereConnection, refreshJohnDeereConnection } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = crypto.randomUUID();
    sessionStorage.setItem('jd_oauth_state', state);
    const authUrl = getJohnDeereAuthUrl(redirectUri, state);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectJohnDeere();
      await refreshJohnDeereConnection();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (johnDeereConnection) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Connected to John Deere</h3>
              <p className="text-sm text-slate-500">
                {johnDeereConnection.selected_org_name
                  ? `Organization: ${johnDeereConnection.selected_org_name}`
                  : 'Select an organization to get started'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4 mr-2" />}
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
            <Link2 className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Connect to John Deere</h3>
            <p className="text-sm text-slate-500">Link your Operations Center account to access your farm data</p>
          </div>
        </div>
        <Button onClick={handleConnect} className="bg-emerald-600 hover:bg-emerald-700">
          <Link2 className="w-4 h-4 mr-2" />
          Connect
        </Button>
      </div>
    </div>
  );
}
