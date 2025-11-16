/**
 * Hook for fetching user statistics
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface UserStats {
  uploadedDataCount: number;
  purchasedDataCount: number;
  zkpComputationCount: number;
  totalRevenue: number;
  totalSpent: number;
}

export interface UseUserStatsReturn {
  stats: UserStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch user's statistics
 */
export function useUserStats(): UseUserStatsReturn {
  const wallet = useWallet();
  const [stats, setStats] = useState<UserStats>({
    uploadedDataCount: 0,
    purchasedDataCount: 0,
    zkpComputationCount: 0,
    totalRevenue: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!wallet.connected || !wallet.account) {
      setStats({
        uploadedDataCount: 0,
        purchasedDataCount: 0,
        zkpComputationCount: 0,
        totalRevenue: 0,
        totalSpent: 0
      });
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

      // Query uploaded data count (DataRegistered events)
      const registeredEvents = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::data_registry::DataRegistered`
        },
        limit: 1000,
        order: 'descending'
      });

      const uploadedData = registeredEvents.data.filter(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.owner === userAddress;
      });

      // Query purchased data count (DataPurchased events)
      const purchasedEvents = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::market::DataPurchased`
        },
        limit: 1000,
        order: 'descending'
      });

      const purchasedData = purchasedEvents.data.filter(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.buyer === userAddress;
      });

      // Calculate total spent
      const totalSpent = purchasedData.reduce((sum, event) => {
        const parsedJson = event.parsedJson as any;
        const amount = parsedJson?.amount || 0;
        return sum + Number(amount);
      }, 0);

      // Query ZKP computation count (ProofSubmitted events)
      const proofEvents = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::zkp_verifier::ProofSubmitted`
        },
        limit: 1000,
        order: 'descending'
      });

      const userProofs = proofEvents.data.filter(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.prover === userAddress;
      });

      // Calculate total revenue from sales
      // We need to match DataPurchased events with DataListed events
      // to find purchases where the current user is the seller
      const listedEvents = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::market::DataListed`
        },
        limit: 1000,
        order: 'descending'
      });

      // Get listings owned by current user
      const userListings = listedEvents.data.filter(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.owner === userAddress;
      });

      // Create a map of listing_id -> price for user's listings
      const userListingPrices = new Map<string, number>();
      userListings.forEach(event => {
        const parsedJson = event.parsedJson as any;
        const listingId = parsedJson?.listing_id;
        const price = parsedJson?.price || 0;
        if (listingId) {
          userListingPrices.set(listingId, Number(price));
        }
      });

      // Calculate revenue from purchases of user's listings
      const allPurchaseEvents = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::market::DataPurchased`
        },
        limit: 1000,
        order: 'descending'
      });

      const totalRevenue = allPurchaseEvents.data.reduce((sum, event) => {
        const parsedJson = event.parsedJson as any;
        const listingId = parsedJson?.listing_id;
        const amount = parsedJson?.amount || 0;

        // Check if this purchase is for one of user's listings
        if (listingId && userListingPrices.has(listingId)) {
          // Subtract platform fees (2.5%)
          return sum + (Number(amount) * 0.975);
        }
        return sum;
      }, 0);

      setStats({
        uploadedDataCount: uploadedData.length,
        purchasedDataCount: purchasedData.length,
        zkpComputationCount: userProofs.length,
        totalRevenue: totalRevenue / 1_000_000_000, // Convert MIST to SUI
        totalSpent: totalSpent / 1_000_000_000
      });

      console.log('📊 User stats:', {
        uploads: uploadedData.length,
        purchases: purchasedData.length,
        computations: userProofs.length,
        revenue: totalRevenue / 1_000_000_000,
        spent: totalSpent / 1_000_000_000
      });

    } catch (err) {
      console.error('❌ Error fetching user stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [wallet.connected, wallet.account?.address]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}
