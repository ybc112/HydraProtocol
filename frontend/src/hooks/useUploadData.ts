/**
 * Hook for uploading data to Walrus and registering on-chain
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';
import { uploadToWalrus, calculateFileHash } from '../utils/walrus';

export interface UploadDataParams {
  file: File;
  dataType: string;
  metadata: string;
  isPublic: boolean;
  price: number;  // Price in SUI
  category: string;
  description: string;
}

export interface UploadResult {
  success: boolean;
  dataRecordId?: string;
  listingId?: string;
  blobId?: string;
  transactionDigest?: string;
  error?: string;
}

export interface UseUploadDataReturn {
  upload: (params: UploadDataParams) => Promise<UploadResult>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

/**
 * Custom hook for uploading data
 */
export function useUploadData(): UseUploadDataReturn {
  const wallet = useWallet();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload data to Walrus and register on Sui blockchain
   */
  const upload = async (params: UploadDataParams): Promise<UploadResult> => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Step 1: Validate wallet connection
      if (!wallet.connected || !wallet.account) {
        const errMsg = 'Wallet not connected. Please connect your wallet first.';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      setUploadProgress(10);

      // Step 2: Calculate file hash
      console.log('📊 Calculating file hash...');
      const dataHash = await calculateFileHash(params.file);
      setUploadProgress(20);

      // Step 3: Encrypt and upload to Walrus
      console.log('📤 Encrypting and uploading to Walrus...');

      const rawBuffer = await params.file.arrayBuffer();
      const cryptoKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        rawBuffer
      );
      const ivAndCiphertext = new Uint8Array(iv.length + new Uint8Array(encryptedBuffer).length);
      ivAndCiphertext.set(iv, 0);
      ivAndCiphertext.set(new Uint8Array(encryptedBuffer), iv.length);

      const encryptedBlob = new Blob([ivAndCiphertext], { type: 'application/octet-stream' });
      const walrusResult = await uploadToWalrus(encryptedBlob);
      setUploadProgress(50);

      console.log(`✅ Walrus upload successful: ${walrusResult.blobId}`);

      // Step 4: Register data on-chain
      console.log('📝 Registering data on Sui blockchain...');

      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });

      const tx = new Transaction();

      // Call register_data function
      // Note: dataHash is Uint8Array, must be converted to array for BCS serialization
      const dataHashArray = Array.from(dataHash);

      tx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::data_registry::register_data`,
        arguments: [
          tx.object(CONTRACT_ADDRESSES.dataRegistryId!),   // registry
          tx.pure.string(walrusResult.blobId),              // walrus_blob_id
          tx.pure.vector('u8', dataHashArray),              // data_hash as vector<u8>
          tx.pure.u64(params.file.size),                   // data_size
          tx.pure.string(params.dataType),                 // data_type
          tx.pure.string(params.metadata),                 // description
          tx.pure.bool(true),                              // encrypted
          tx.pure.bool(params.isPublic),                   // is_public
          tx.object('0x6'),                                // clock
        ],
      });

      setUploadProgress(70);

      // Sign and execute transaction
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      // Wait for transaction confirmation
      const txResult = await client.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      setUploadProgress(85);

      // Extract created DataRecord ID
      const objectChanges = txResult.objectChanges || [];
      const createdObjects = objectChanges.filter((change: any) => change.type === 'created');
      const dataRecord = createdObjects.find((obj: any) =>
        obj.objectType?.includes('::data_registry::DataRecord')
      );

      if (!dataRecord || !('objectId' in dataRecord)) {
        throw new Error('Failed to find created DataRecord in transaction');
      }

      const dataRecordId = (dataRecord as any).objectId;
      console.log(`✅ Data registered on-chain: ${dataRecordId}`);

      // Step 5: List data on marketplace
      console.log('🏪 Listing data on marketplace...');

      const listTx = new Transaction();

      // Convert SUI to MIST (1 SUI = 1e9 MIST)
      const priceInMist = Math.floor(params.price * 1e9);

      listTx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::market::list_data`,
        arguments: [
          listTx.object(CONTRACT_ADDRESSES.marketplaceId!),  // marketplace
          listTx.object(dataRecordId),                        // data_record
          listTx.pure.u64(priceInMist),                      // price
          listTx.pure.string(params.category),                // category
          listTx.pure.string(params.description),             // description
          listTx.object('0x6'),                               // clock
        ],
      });

      const listResult = await wallet.signAndExecuteTransaction({
        transaction: listTx,
      });

      const listTxResult = await client.waitForTransaction({
        digest: listResult.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Extract listing ID
      const listObjectChanges = listTxResult.objectChanges || [];
      const listCreatedObjects = listObjectChanges.filter((change: any) => change.type === 'created');
      const listing = listCreatedObjects.find((obj: any) =>
        obj.objectType?.includes('::market::DataListing')
      );

      const listingId = listing && 'objectId' in listing ? (listing as any).objectId : undefined;

      // Store encryption key in localStorage（用于后续分发给买家，链上不存明文）
      try {
        const exportedKey = await crypto.subtle.exportKey('raw', cryptoKey);
        const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
        localStorage.setItem(`hydra:blobKey:${walrusResult.blobId}`, keyBase64);
      } catch (e) {
        console.warn('Failed to store encryption key in localStorage:', e);
      }

      setUploadProgress(100);

      console.log(`✅ Data listed on marketplace: ${listingId}`);

      return {
        success: true,
        dataRecordId,
        listingId,
        blobId: walrusResult.blobId,
        transactionDigest: result.digest,
      };

    } catch (err) {
      console.error('❌ Upload failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to upload data';
      setError(errMsg);
      return {
        success: false,
        error: errMsg,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    upload,
    isUploading,
    uploadProgress,
    error,
  };
}
