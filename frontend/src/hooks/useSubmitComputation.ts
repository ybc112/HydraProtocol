/**
 * Hook for submitting ZKP computations
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface ComputationParams {
  circuitName: string;        // "average" or "threshold"
  proof: Uint8Array;          // ZKP proof bytes
  publicInputs: Uint8Array;   // Public inputs (computation results)
  dataRecordIds: string[];    // IDs of data records used
  metadata: string;           // JSON metadata about computation
}

export interface SubmitComputationResult {
  txDigest: string;
  resultObjectId: string;
}

export interface UseSubmitComputationReturn {
  submitComputation: (params: ComputationParams) => Promise<SubmitComputationResult>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Custom hook to submit ZKP computation proofs to the smart contract
 */
export function useSubmitComputation(): UseSubmitComputationReturn {
  const wallet = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComputation = async (params: ComputationParams): Promise<SubmitComputationResult> => {
    if (!wallet.connected || !wallet.account) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsSubmitting(true);
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

      console.log('📊 Submitting ZKP computation:', {
        circuit: params.circuitName,
        dataRecords: params.dataRecordIds.length,
        proofSize: params.proof.length,
        publicInputsSize: params.publicInputs.length
      });

      // Build transaction
      const tx = new Transaction();

      tx.moveCall({
        target: `${packageId}::zkp_verifier::submit_proof_authorized`,
        arguments: [
          tx.object(params.dataRecordIds[0]),
          tx.pure.vector('u8', Array.from(params.proof)),
          tx.pure.vector('u8', Array.from(params.publicInputs)),
          tx.pure.string(params.circuitName),
          tx.pure.string(params.metadata),
          tx.object('0x6'),
        ],
      });

      // Sign and execute transaction
      const txResult = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      const txDigest = txResult.digest;
      console.log('✅ Computation submitted successfully:', txDigest);

      // Query transaction details from RPC to get objectChanges
      // Retry up to 10 times with 500ms delay between attempts
      console.log('📡 Querying transaction details from RPC...');

      let txDetails: any = null;
      const maxRetries = 10;
      const retryDelay = 500;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          txDetails = await client.getTransactionBlock({
            digest: txDigest,
            options: {
              showObjectChanges: true,
              showEffects: true,
            },
          });

          // Check if we got objectChanges
          if (txDetails.objectChanges && txDetails.objectChanges.length > 0) {
            console.log(`✅ Transaction indexed after ${attempt} attempt(s)`);
            break;
          }

          console.log(`⏳ Attempt ${attempt}/${maxRetries} - objectChanges empty, retrying...`);
        } catch (error) {
          console.log(`⏳ Attempt ${attempt}/${maxRetries} - query failed, retrying...`);
        }

        // Wait before next retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      if (!txDetails || !txDetails.objectChanges) {
        throw new Error('Failed to query transaction details after multiple attempts');
      }

      // Extract objectChanges from the queried transaction
      const objectChanges = txDetails.objectChanges || [];
      console.log('📋 ObjectChanges count:', objectChanges.length);

      if (objectChanges.length > 0) {
        console.log('📋 All objectChanges:', JSON.stringify(objectChanges, null, 2));
      }

      // Extract ComputationResult object ID
      const computationResult = objectChanges.find((obj: any) => {
        const hasCorrectType = obj.objectType?.includes('::zkp_verifier::ComputationResult');
        const isCreated = obj.type === 'created';

        console.log(`🔍 Checking: type=${obj.type}, hasCorrectType=${hasCorrectType}, match=${hasCorrectType && isCreated}`);

        return hasCorrectType && isCreated;
      });

      if (!computationResult) {
        console.error('❌ Available objectChanges:', objectChanges);
        console.error('❌ Looking for objectType containing: ::zkp_verifier::ComputationResult');
        throw new Error('Failed to find ComputationResult in transaction. The transaction succeeded but object was not found.');
      }

      if (!('objectId' in computationResult)) {
        console.error('❌ Found object but no objectId:', computationResult);
        throw new Error('ComputationResult found but missing objectId field');
      }

      const resultObjectId = (computationResult as any).objectId;

      console.log('✅ ComputationResult object found:', {
        objectId: resultObjectId,
        type: computationResult.type,
        objectType: computationResult.objectType
      });

      return {
        txDigest: txResult.digest,
        resultObjectId
      };

    } catch (err) {
      console.error('❌ Failed to submit computation:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit computation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitComputation,
    isSubmitting,
    error
  };
}
