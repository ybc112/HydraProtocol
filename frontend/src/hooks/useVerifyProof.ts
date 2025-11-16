/**
 * Hook for verifying ZKP computation proofs on-chain
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface VerifyProofParams {
  resultObjectId: string;      // ComputationResult object ID
  vkObjectId: string;          // VerificationKey object ID
  circuitName: string;         // Circuit name for validation
}

export interface UseVerifyProofReturn {
  verifyProof: (params: VerifyProofParams) => Promise<string>;
  isVerifying: boolean;
  error: string | null;
}

/**
 * Custom hook to verify ZKP proofs on the blockchain
 * This must be called AFTER submit_proof to move the result from "Pending" to "Verified"
 */
export function useVerifyProof(): UseVerifyProofReturn {
  const wallet = useWallet();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyProof = async (params: VerifyProofParams): Promise<string> => {
    if (!wallet.connected || !wallet.account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsVerifying(true);
      setError(null);

      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });

      const packageId = CONTRACT_ADDRESSES.packageId;
      const registryId = CONTRACT_ADDRESSES.zkpRegistryId;

      if (!packageId || !registryId) {
        console.error('Missing contract addresses:', { packageId, registryId });
        throw new Error('Contract addresses not configured. Please check .env.local file.');
      }

      console.log('🔐 Verifying ZKP proof:', {
        circuit: params.circuitName,
        resultId: params.resultObjectId,
        vkId: params.vkObjectId
      });

      // Build transaction
      const tx = new Transaction();

      // Call verify_proof function
      tx.moveCall({
        target: `${packageId}::zkp_verifier::verify_proof`,
        arguments: [
          tx.object(registryId),              // ZKPRegistry
          tx.object(params.resultObjectId),   // ComputationResult
          tx.object(params.vkObjectId),       // VerificationKey
          tx.object('0x6'),                   // Clock object
        ],
      });

      // Sign and execute transaction
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      console.log('✅ Proof verified successfully:', result.digest);

      return result.digest;

    } catch (err) {
      console.error('❌ Failed to verify proof:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify proof';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    verifyProof,
    isVerifying,
    error
  };
}
