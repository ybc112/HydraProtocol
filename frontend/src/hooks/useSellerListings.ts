"use client";
import { useEffect, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface SellerListing {
  listingId: string;
  dataRecordId: string;
  buyers: string[];
}

export function useSellerListings() {
  const wallet = useWallet();
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!wallet.connected || !wallet.account) {
        setListings([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const config = getHydraConfig();
        const client = new SuiClient({
          url: config.sui?.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io:443'
            : 'https://fullnode.mainnet.sui.io:443'
        });

        // 获取卖家相关的挂牌事件（共享对象不会在 ownedObjects 中出现）
        const listedEvents = await client.queryEvents({
          query: { MoveEventType: `${CONTRACT_ADDRESSES.packageId}::market::DataListed` },
          limit: 500,
          order: 'descending'
        });

        const purchasedEvents = await client.queryEvents({
          query: { MoveEventType: `${CONTRACT_ADDRESSES.packageId}::market::DataPurchased` },
          limit: 500,
          order: 'descending'
        });

        const result: SellerListing[] = [];
        for (const ev of listedEvents.data) {
          const pj: any = ev.parsedJson;
          if (!pj) continue;
          if (pj.owner !== wallet.account.address) continue;
          const listingId = pj.listing_id as string;
          const dataRecordId = pj.data_record_id as string;

          const buyersSet = new Set<string>();
          for (const pev of purchasedEvents.data) {
            const ppj: any = pev.parsedJson;
            if (ppj && ppj.listing_id === listingId && ppj.buyer) {
              buyersSet.add(ppj.buyer as string);
            }
          }

          result.push({ listingId, dataRecordId, buyers: Array.from(buyersSet) });
        }

        setListings(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load listings');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [wallet.connected, wallet.account?.address]);

  return { listings, loading, error };
}