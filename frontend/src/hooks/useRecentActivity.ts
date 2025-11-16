/**
 * Hook for fetching recent user activity
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface Activity {
  id: string;
  type: 'upload' | 'purchase' | 'compute' | 'verify' | 'list';
  title: string;
  description: string;
  timestamp: number;
  txDigest: string;
  icon: string;
  color: string;
}

export interface UseRecentActivityReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch user's recent activity
 */
export function useRecentActivity(limit: number = 10): UseRecentActivityReturn {
  const wallet = useWallet();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    if (!wallet.connected || !wallet.account) {
      setActivities([]);
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

      const packageId = CONTRACT_ADDRESSES.packageId;
      if (!packageId) {
        throw new Error('Package ID not configured');
      }

      const userAddress = wallet.account.address;
      const allActivities: Activity[] = [];

      // Fetch DataRegistered events (uploads)
      try {
        const registeredEvents = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::data_registry::DataRegistered`
          },
          limit: 50,
          order: 'descending'
        });

        registeredEvents.data
          .filter(event => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.owner === userAddress;
          })
          .forEach(event => {
            const parsedJson = event.parsedJson as any;
            allActivities.push({
              id: event.id.txDigest + '-upload',
              type: 'upload',
              title: 'Data Uploaded',
              description: `Uploaded ${parsedJson.data_type || 'data'} to Walrus`,
              timestamp: event.timestampMs ? Number(event.timestampMs) : Date.now(),
              txDigest: event.id.txDigest,
              icon: '📤',
              color: 'emerald'
            });
          });
      } catch (err) {
        console.warn('Failed to fetch upload events:', err);
      }

      // Fetch DataListed events
      try {
        const listedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::market::DataListed`
          },
          limit: 50,
          order: 'descending'
        });

        listedEvents.data
          .filter(event => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.owner === userAddress;
          })
          .forEach(event => {
            const parsedJson = event.parsedJson as any;
            allActivities.push({
              id: event.id.txDigest + '-list',
              type: 'list',
              title: 'Data Listed',
              description: `Listed data for ${(Number(parsedJson.price) / 1_000_000_000).toFixed(2)} SUI`,
              timestamp: event.timestampMs ? Number(event.timestampMs) : Date.now(),
              txDigest: event.id.txDigest,
              icon: '🏪',
              color: 'blue'
            });
          });
      } catch (err) {
        console.warn('Failed to fetch listing events:', err);
      }

      // Fetch DataPurchased events (purchases)
      try {
        const purchasedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::market::DataPurchased`
          },
          limit: 50,
          order: 'descending'
        });

        purchasedEvents.data
          .filter(event => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.buyer === userAddress;
          })
          .forEach(event => {
            const parsedJson = event.parsedJson as any;
            allActivities.push({
              id: event.id.txDigest + '-purchase',
              type: 'purchase',
              title: 'Data Purchased',
              description: `Purchased data for ${(Number(parsedJson.price) / 1_000_000_000).toFixed(2)} SUI`,
              timestamp: event.timestampMs ? Number(event.timestampMs) : Date.now(),
              txDigest: event.id.txDigest,
              icon: '🛒',
              color: 'purple'
            });
          });
      } catch (err) {
        console.warn('Failed to fetch purchase events:', err);
      }

      // Fetch ProofSubmitted events (computations)
      try {
        const proofEvents = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::zkp_verifier::ProofSubmitted`
          },
          limit: 50,
          order: 'descending'
        });

        proofEvents.data
          .filter(event => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.prover === userAddress;
          })
          .forEach(event => {
            const parsedJson = event.parsedJson as any;
            allActivities.push({
              id: event.id.txDigest + '-compute',
              type: 'compute',
              title: 'ZKP Proof Generated',
              description: `Computed ${parsedJson.circuit_name || 'calculation'} with ZKP`,
              timestamp: event.timestampMs ? Number(event.timestampMs) : Date.now(),
              txDigest: event.id.txDigest,
              icon: '🔐',
              color: 'indigo'
            });
          });
      } catch (err) {
        console.warn('Failed to fetch proof events:', err);
      }

      // Fetch ProofVerified events
      try {
        const verifiedEvents = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::zkp_verifier::ProofVerified`
          },
          limit: 50,
          order: 'descending'
        });

        verifiedEvents.data
          .filter(event => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.prover === userAddress;
          })
          .forEach(event => {
            const parsedJson = event.parsedJson as any;
            allActivities.push({
              id: event.id.txDigest + '-verify',
              type: 'verify',
              title: 'Proof Verified',
              description: `Verified ${parsedJson.circuit_name || 'proof'} on-chain`,
              timestamp: event.timestampMs ? Number(event.timestampMs) : Date.now(),
              txDigest: event.id.txDigest,
              icon: '✅',
              color: 'green'
            });
          });
      } catch (err) {
        console.warn('Failed to fetch verification events:', err);
      }

      // Sort by timestamp (newest first) and limit
      allActivities.sort((a, b) => b.timestamp - a.timestamp);
      const limitedActivities = allActivities.slice(0, limit);

      setActivities(limitedActivities);

      console.log(`📈 Found ${allActivities.length} activities (showing ${limitedActivities.length})`);

    } catch (err) {
      console.error('❌ Error fetching recent activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [wallet.connected, wallet.account?.address]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivity
  };
}
