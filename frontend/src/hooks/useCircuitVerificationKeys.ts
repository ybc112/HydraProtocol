/**
 * Hook for fetching circuit verification keys from the blockchain
 */

'use client';

import { useState, useEffect } from 'react';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface VerificationKeyInfo {
  objectId: string;
  circuitName: string;
  curveType: number;
  description: string;
  owner: string;
  active: boolean;
  createdAt: number;
}

export interface UseCircuitVerificationKeysReturn {
  verificationKeys: Map<string, VerificationKeyInfo>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  getVkIdByCircuit: (circuitName: string) => string | null;
}

/**
 * Hook to fetch all registered circuit verification keys
 */
export function useCircuitVerificationKeys(): UseCircuitVerificationKeysReturn {
  const [verificationKeys, setVerificationKeys] = useState<Map<string, VerificationKeyInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationKeys = async () => {
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

      // Query CircuitRegistered events to find all verification keys
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::zkp_verifier::CircuitRegistered`
        },
        limit: 100,
        order: 'descending'
      });

      console.log(`📋 Found ${events.data.length} circuit registration events`);

      const vkMap = new Map<string, VerificationKeyInfo>();

      for (const event of events.data) {
        const parsedJson = event.parsedJson as any;

        const vkInfo: VerificationKeyInfo = {
          objectId: parsedJson.vk_id,
          circuitName: parsedJson.circuit_name,
          curveType: parsedJson.curve_type,
          description: '', // Will be filled if we query the object
          owner: parsedJson.owner,
          active: true, // Assume active by default
          createdAt: parsedJson.timestamp || 0
        };

        vkMap.set(parsedJson.circuit_name, vkInfo);
      }

      console.log('✅ Loaded verification keys:', Array.from(vkMap.keys()));
      setVerificationKeys(vkMap);

    } catch (err) {
      console.error('❌ Failed to fetch verification keys:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch verification keys';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationKeys();
  }, []);

  const getVkIdByCircuit = (circuitName: string): string | null => {
    const vk = verificationKeys.get(circuitName);
    return vk ? vk.objectId : null;
  };

  return {
    verificationKeys,
    loading,
    error,
    refetch: fetchVerificationKeys,
    getVkIdByCircuit
  };
}
