/**
 * Hook for fetching ZKP computation results
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface ComputationResult {
  resultId: string;
  circuitName: string;
  proof: string;              // Hex encoded proof
  publicInputs: string;       // Hex encoded public inputs
  dataRecordIds: string[];
  prover: string;
  verified: boolean;
  verifiedAt: number;
  submittedAt: number;
  metadata: string;
  txDigest: string;
}

export interface UseComputationResultsReturn {
  results: ComputationResult[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch user's computation results
 */
export function useComputationResults(): UseComputationResultsReturn {
  const wallet = useWallet();
  const [results, setResults] = useState<ComputationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    if (!wallet.connected || !wallet.account) {
      setResults([]);
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

      console.log('📊 Querying computation results for:', wallet.account.address);

      // Query ProofSubmitted events for this user
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::zkp_verifier::ProofSubmitted`
        },
        limit: 100,
        order: 'descending'
      });

      console.log(`Found ${events.data.length} ProofSubmitted events`);

      // Filter events for current user
      const userResults = events.data.filter(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.prover === wallet.account!.address;
      });

      console.log(`User has ${userResults.length} computation results`);

      // For each result, query the actual ComputationResult object to get verified status
      const parsedResults: ComputationResult[] = await Promise.all(
        userResults.map(async (event) => {
          const parsedJson = event.parsedJson as any;
          const resultId = parsedJson.result_id;

          // Query the actual ComputationResult object to get all details
          let verified = false;
          let verifiedAt = 0;
          let proof = '';
          let publicInputs = '';
          let metadata = '';
          let submittedAt = 0;

          try {
            const obj = await client.getObject({
              id: resultId,
              options: {
                showContent: true,
              },
            });

            if (obj.data && 'content' in obj.data && obj.data.content) {
              const content = obj.data.content as any;
              if (content.fields) {
                verified = content.fields.verified || false;
                verifiedAt = content.fields.verified_at || 0;
                submittedAt = content.fields.submitted_at || 0;
                
                // Convert proof bytes to hex string
                if (content.fields.proof) {
                  proof = Array.isArray(content.fields.proof) 
                    ? content.fields.proof.map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : content.fields.proof;
                }
                
                // Convert public_inputs bytes to hex string
                if (content.fields.public_inputs) {
                  publicInputs = Array.isArray(content.fields.public_inputs)
                    ? content.fields.public_inputs.map((b: number) => b.toString(16).padStart(2, '0')).join('')
                    : content.fields.public_inputs;
                }
                
                metadata = content.fields.metadata || '';
              }
            }
          } catch (objErr) {
            console.warn(`⚠️ Failed to fetch object ${resultId}:`, objErr);
          }

          return {
            resultId: resultId || event.id.txDigest,
            circuitName: parsedJson.circuit_name || 'unknown',
            proof: proof,
            publicInputs: publicInputs,
            dataRecordIds: parsedJson.data_record_ids || [],
            prover: parsedJson.prover || '',
            verified: verified,
            verifiedAt: verifiedAt,
            submittedAt: submittedAt || (parsedJson.timestamp ? Number(parsedJson.timestamp) : 0),
            metadata: metadata,
            txDigest: event.id.txDigest,
          };
        })
      );

      setResults(parsedResults);

    } catch (err) {
      console.error('❌ Error fetching computation results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch computation results');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [wallet.connected, wallet.account?.address]);

  return {
    results,
    loading,
    error,
    refetch: fetchResults
  };
}
