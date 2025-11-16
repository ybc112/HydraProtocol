"use client";
import { useEffect, useState } from 'react';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface KeyDistributionItem {
  buyer: string;
  timestamp: number;
  txDigest: string;
}

export function useKeyDistributionHistory(dataRecordId?: string) {
  const [items, setItems] = useState<KeyDistributionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    if (!dataRecordId) { setItems([]); return; }
    try {
      setLoading(true);
      setError(null);
      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });
      const eventType = `${CONTRACT_ADDRESSES.packageId}::data_registry::KeyDistributed`;
      const events = await client.queryEvents({ query: { MoveEventType: eventType }, limit: 200, order: 'descending' });
      const out: KeyDistributionItem[] = [];
      for (const ev of events.data) {
        const pj: any = ev.parsedJson;
        if (pj && pj.data_id === dataRecordId) {
          out.push({
            buyer: pj.buyer,
            timestamp: pj.timestamp || 0,
            txDigest: (ev as any).id?.txDigest || (ev as any).transactionDigest || ''
          });
        }
      }
      setItems(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [dataRecordId]);

  return { items, loading, error, refresh: fetch };
}