"use client";
import { useEffect, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export function usePurchasedStatus(listingIds: string[]) {
  const wallet = useWallet();
  const [map, setMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!wallet.connected || !wallet.account || listingIds.length === 0) {
        setMap({});
        return;
      }
      try {
        setLoading(true);
        const config = getHydraConfig();
        const client = new SuiClient({
          url: config.sui?.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io:443'
            : 'https://fullnode.mainnet.sui.io:443'
        });
        const events = await client.queryEvents({
          query: { MoveEventType: `${CONTRACT_ADDRESSES.packageId}::market::DataPurchased` },
          limit: 1000,
          order: 'descending'
        });
        const addr = wallet.account.address;
        const purchasedSet = new Set<string>();
        for (const ev of events.data) {
          const pj: any = ev.parsedJson;
          if (pj && pj.buyer === addr) {
            purchasedSet.add(pj.listing_id);
          }
        }
        const next: Record<string, boolean> = {};
        for (const id of listingIds) next[id] = purchasedSet.has(id);
        setMap(next);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [wallet.connected, wallet.account?.address, JSON.stringify(listingIds)]);

  return { purchasedMap: map, loading };
}