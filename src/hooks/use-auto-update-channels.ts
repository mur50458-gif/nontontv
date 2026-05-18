'use client';

import { useState, useEffect, useCallback } from 'react';
import { channels as staticChannels, TVChannel } from '@/lib/channels';

interface UpdateResult {
  channels: TVChannel[];
  updatedCount: number;
  newCount: number;
  updatedAt: string | null;
  isUpdating: boolean;
  lastError: string | null;
}

export function useAutoUpdateChannels() {
  const [result, setResult] = useState<UpdateResult>({
    channels: staticChannels,
    updatedCount: 0,
    newCount: 0,
    updatedAt: null,
    isUpdating: false,
    lastError: null,
  });

  const updateChannels = useCallback(async () => {
    setResult(prev => ({ ...prev, isUpdating: true, lastError: null }));

    try {
      const res = await fetch('/api/channels');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const apiChannels: TVChannel[] = data.channels || [];
      const updatedAt: string = data.updatedAt || new Date().toISOString();

      if (apiChannels.length > 0) {
        // Count how many are new compared to static
        const staticIds = new Set(staticChannels.map(ch => ch.id));
        const newCount = apiChannels.filter(ch => !staticIds.has(ch.id)).length;

        setResult({
          channels: apiChannels,
          updatedCount: apiChannels.length,
          newCount,
          updatedAt,
          isUpdating: false,
          lastError: null,
        });
      } else {
        // Fallback to static channels
        setResult(prev => ({
          ...prev,
          isUpdating: false,
          lastError: 'No channels from API, using static data',
        }));
      }
    } catch (err) {
      setResult(prev => ({
        ...prev,
        isUpdating: false,
        lastError: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  // Auto-update on mount and every 15 minutes
  useEffect(() => {
    updateChannels();
    const interval = setInterval(updateChannels, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [updateChannels]);

  return result;
}
