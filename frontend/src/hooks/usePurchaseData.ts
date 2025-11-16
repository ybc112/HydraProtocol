/**
 * Hook for purchasing data access from the marketplace
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';
import { x25519 } from '@noble/curves/ed25519';

export interface PurchaseResult {
  success: boolean;
  transactionDigest?: string;
  error?: string;
}

export interface UsePurchaseDataReturn {
  purchase: (listingId: string, priceInSui: number) => Promise<PurchaseResult>;
  isPurchasing: boolean;
  error: string | null;
}

/**
 * Custom hook for purchasing data access
 */
export function usePurchaseData(): UsePurchaseDataReturn {
  const wallet = useWallet();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Purchase data access from the marketplace
   * @param listingId - The ID of the data listing
   * @param priceInSui - Price in SUI tokens
   */
  const purchase = async (
    listingId: string,
    priceInSui: number
  ): Promise<PurchaseResult> => {
    try {
      setIsPurchasing(true);
      setError(null);

      // Validate wallet connection
      if (!wallet.connected || !wallet.account) {
        const errMsg = 'Wallet not connected. Please connect your wallet first.';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });

      // Fetch listing details to get data_record_id
      let dataRecordId: string;
      try {
        const listingObject = await client.getObject({
          id: listingId,
          options: { showContent: true }
        });

        if (listingObject.data?.content && 'fields' in listingObject.data.content) {
          const fields = listingObject.data.content.fields as any;
          const listingOwner = fields.owner;
          dataRecordId = fields.data_record_id;

          if (!dataRecordId) {
            const errMsg = 'Invalid listing: missing data_record_id';
            setError(errMsg);
            return { success: false, error: errMsg };
          }

          if (listingOwner === wallet.account.address) {
            const errMsg = 'You cannot purchase your own data. Please use a different wallet.';
            setError(errMsg);
            return { success: false, error: errMsg };
          }
        } else {
          const errMsg = 'Could not fetch listing details';
          setError(errMsg);
          return { success: false, error: errMsg };
        }
      } catch (checkErr) {
        console.error('Error fetching listing:', checkErr);
        const errMsg = 'Failed to fetch listing details';
        setError(errMsg);
        return { success: false, error: errMsg };
      }

      // Ensure user encryption pubkey is registered
      try {
        const privKeyB64 = localStorage.getItem(`hydra:encPrivKey:${wallet.account.address}`);
        if (!privKeyB64) {
          const priv = x25519.utils.randomPrivateKey();
          const pub = x25519.getPublicKey(priv);
          const privB64 = btoa(String.fromCharCode(...priv));
          localStorage.setItem(`hydra:encPrivKey:${wallet.account.address}`, privB64);
          const txReg = new Transaction();
          txReg.moveCall({
            target: `${CONTRACT_ADDRESSES.packageId}::data_registry::register_user_pubkey`,
            arguments: [
              txReg.object(CONTRACT_ADDRESSES.dataRegistryId!),
              txReg.pure.vector('u8', Array.from(pub)),
            ],
          });
          await wallet.signAndExecuteTransaction({ transaction: txReg });
        }
      } catch (e) {
        console.warn('Failed to register encryption pubkey', e);
      }

      // Create transaction
      const tx = new Transaction();

      // Convert SUI to MIST (1 SUI = 1e9 MIST)
      const priceInMist = Math.floor(priceInSui * 1e9);

      // Split coins for payment
      const [coin] = tx.splitCoins(tx.gas, [priceInMist]);

      // Call the purchase_data_access function on the market contract
      // Function signature: purchase_data_access(marketplace, listing, data_record, payment, expires_at, clock, ctx)
      tx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::market::purchase_data_access`,
        arguments: [
          tx.object(CONTRACT_ADDRESSES.marketplaceId!),  // marketplace: &mut Marketplace
          tx.object(listingId),                          // listing: &mut DataListing
          tx.object(dataRecordId),                       // data_record: &DataRecord (for encryption key)
          coin,                                           // payment: Coin<SUI>
          tx.pure.u64(Date.now() + 30 * 24 * 60 * 60 * 1000), // expires_at: u64 (30 days from now)
          tx.object('0x6'),                               // clock: &Clock (Sui Clock object at 0x6)
        ],
      });

      // Sign and execute transaction
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      // Wait for transaction confirmation
      const txResult = await client.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // Check if transaction was successful
      if (txResult.effects?.status?.status === 'success') {
        console.log('Purchase successful:', txResult.digest);
        return {
          success: true,
          transactionDigest: txResult.digest,
        };
      } else {
        const errMsg = `Transaction failed: ${txResult.effects?.status?.error || 'Unknown error'}`;
        setError(errMsg);
        return {
          success: false,
          error: errMsg,
        };
      }
    } catch (err) {
      console.error('Error purchasing data:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to purchase data';
      setError(errMsg);
      return {
        success: false,
        error: errMsg,
      };
    } finally {
      setIsPurchasing(false);
    }
  };

  return {
    purchase,
    isPurchasing,
    error,
  };
}

/**
 * Hook for checking if user has purchased a dataset
 */
export function useHasPurchased(listingId: string): {
  hasPurchased: boolean;
  loading: boolean;
  checkPurchase: () => Promise<void>;
} {
  const wallet = useWallet();
  const [hasPurchased, setHasPurchased] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkPurchase = async () => {
    if (!wallet.connected || !wallet.account) {
      setHasPurchased(false);
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

      // Query the listing object to check if the user has purchased
      const listingObject = await client.getObject({
        id: listingId,
        options: { showContent: true }
      });

      if (listingObject.data?.content && 'fields' in listingObject.data.content) {
        const fields = listingObject.data.content.fields as any;
        const purchasers = fields.purchasers || {};

        // Check if current wallet address is in the purchasers table
        const userAddress = wallet.account.address;
        setHasPurchased(!!purchasers[userAddress]);
      }
    } catch (err) {
      console.error('Error checking purchase status:', err);
      setHasPurchased(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasPurchased,
    loading,
    checkPurchase,
  };
}
