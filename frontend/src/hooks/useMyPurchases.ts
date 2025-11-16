/**
 * Hook for fetching user's purchased data
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';

export interface PurchasedData {
  purchaseId: string;
  listingId: string;
  dataRecordId: string;
  blobId: string;
  title: string;
  description: string;
  dataType: string;
  price: string;
  purchasedAt: number;
  expiresAt: number;
  owner: string;
  fileName?: string;      // Original file name
  fileType?: string;      // MIME type
  fileExtension?: string; // File extension (e.g., '.png', '.jpg')
}

export interface UseMyPurchasesReturn {
  purchases: PurchasedData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch user's purchased data
 */
export function useMyPurchases(): UseMyPurchasesReturn {
  const wallet = useWallet();
  const [purchases, setPurchases] = useState<PurchasedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async () => {
    if (!wallet.connected || !wallet.account) {
      setPurchases([]);
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

      // Query DataPurchased events for this user
      console.log('Querying purchases for:', wallet.account.address);

      const events = await client.queryEvents({
        query: {
          MoveEventType: `${packageId}::market::DataPurchased`
        },
        limit: 100,
        order: 'descending'
      });

      console.log(`Found ${events.data.length} purchase events`);

      // Filter events for current user
      const userPurchases = events.data.filter(event => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.buyer === wallet.account!.address;
      });

      console.log(`User has ${userPurchases.length} purchases`);

      // Fetch details for each purchase
      const purchaseDetails = await Promise.all(
        userPurchases.map(async (event) => {
          try {
            const parsedJson = event.parsedJson as any;
            const purchaseId = event.id.txDigest;
            const listingId = parsedJson.listing_id;

            // Fetch the listing object to get details
            const listingObject = await client.getObject({
              id: listingId,
              options: { showContent: true }
            });

            if (listingObject.data?.content && 'fields' in listingObject.data.content) {
              const listingFields = listingObject.data.content.fields as any;
              const dataRecordId = listingFields.data_record_id;

              // Fetch the data record to get blob_id
              const dataRecord = await client.getObject({
                id: dataRecordId,
                options: { showContent: true }
              });

              let blobId = '';
              let title = 'Unknown Data';
              let description = listingFields.description || '';
              let dataType = listingFields.data_type || '';
              let fileName: string | undefined;
              let fileType: string | undefined;
              let fileExtension: string | undefined;

              if (dataRecord.data?.content && 'fields' in dataRecord.data.content) {
                const recordFields = dataRecord.data.content.fields as any;
                blobId = recordFields.walrus_blob_id || '';

                // Parse metadata to extract file information
                const metadata = recordFields.description || '';
                try {
                  const metadataObj = JSON.parse(metadata);
                  fileName = metadataObj.fileName;
                  fileType = metadataObj.fileType;
                  // Extract extension from fileName
                  if (fileName && fileName.includes('.')) {
                    fileExtension = fileName.substring(fileName.lastIndexOf('.'));
                  }

                  // Use fileName as title if available, otherwise use listing description
                  if (fileName) {
                    title = fileName;
                  } else {
                    title = listingFields.description || dataType || 'Data Record';
                  }
                } catch (e) {
                  // Metadata is not JSON, use description as-is
                  console.log('Could not parse metadata as JSON');
                  title = recordFields.description || listingFields.description || 'Data Record';
                }
              }

              return {
                purchaseId,
                listingId,
                dataRecordId,
                blobId,
                title,
                description,
                dataType,
                price: `${(listingFields.price / 1e9).toFixed(2)} SUI`,
                purchasedAt: parsedJson.timestamp || 0,
                expiresAt: parsedJson.expires_at || 0,
                owner: listingFields.owner,
                fileName,
                fileType,
                fileExtension
              } as PurchasedData;
            }

            return null;
          } catch (err) {
            console.warn('Error fetching purchase details:', err);
            return null;
          }
        })
      );

      const validPurchases = purchaseDetails.filter((p): p is PurchasedData => p !== null);
      setPurchases(validPurchases);

    } catch (err) {
      console.error('Error fetching purchases:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [wallet.connected, wallet.account?.address]);

  return {
    purchases,
    loading,
    error,
    refetch: fetchPurchases
  };
}
