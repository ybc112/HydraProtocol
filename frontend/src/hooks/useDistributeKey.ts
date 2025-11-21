"use client";
import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';
import { x25519 } from '@noble/curves/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { readSymmetricKey, saveSymmetricKey } from '../utils/secure-store';

export interface DistributeKeyParams {
  dataRecordId: string;
  listingId: string;
  buyerAddress: string;
}

export interface DistributeKeyResult {
  success: boolean;
  txDigest?: string;
  error?: string;
}

export function useDistributeKey() {
  const wallet = useWallet();
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const distributeKey = async (params: DistributeKeyParams): Promise<DistributeKeyResult> => {
    try {
      setIsDistributing(true);
      setError(null);

      if (!wallet.connected || !wallet.account) {
        return { success: false, error: 'Wallet not connected' };
      }

      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });

      const record = await client.getObject({ id: params.dataRecordId, options: { showContent: true } });
      if (!record.data?.content || !('fields' in record.data.content)) {
        return { success: false, error: 'Invalid DataRecord' };
      }
      const fields = record.data.content.fields as any;
      const blobId = fields.walrus_blob_id;

      let symKey: Uint8Array | null = null;

      // 优先从安全存储读取对称密钥
      try {
        symKey = await readSymmetricKey(blobId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to read local symmetric key';
        return { success: false, error: msg };
      }

      // 兼容旧版本：从 localStorage 读取并尝试迁移到安全存储
      if (!symKey) {
        const legacyB64 = typeof window !== 'undefined'
          ? localStorage.getItem(`hydra:blobKey:${blobId}`) || undefined
          : undefined;
        if (legacyB64) {
          const legacyBytes = Uint8Array.from(atob(legacyB64), c => c.charCodeAt(0));
          symKey = legacyBytes;
          try {
            await saveSymmetricKey(blobId, legacyBytes);
            localStorage.removeItem(`hydra:blobKey:${blobId}`);
            console.log(`✅ Migrated symmetric key for blob ${blobId} to secure store`);
          } catch (e) {
            console.warn('Failed to migrate symmetric key to secure store:', e);
          }
        }
      }

      if (!symKey) {
        return { success: false, error: 'Missing local symmetric key' };
      }

      const eventType = `${CONTRACT_ADDRESSES.packageId}::data_registry::UserKeyRegistered`;
      const events = await client.queryEvents({ query: { MoveEventType: eventType }, limit: 200, order: 'descending' });
      let buyerPub: Uint8Array | null = null;
      for (const ev of events.data) {
        const pj: any = ev.parsedJson;
        if (pj && pj.user === params.buyerAddress && pj.pubkey) {
          buyerPub = new Uint8Array(pj.pubkey as number[]);
          break;
        }
      }
      if (!buyerPub) {
        return { success: false, error: 'Buyer pubkey not found (ensure buyer registered pubkey)' };
      }

      const ownerPriv = x25519.utils.randomPrivateKey();
      const ownerPub = x25519.getPublicKey(ownerPriv);
      const shared = x25519.getSharedSecret(ownerPriv, buyerPub);
      const sharedU8 = new Uint8Array(shared.length);
      for (let i = 0; i < shared.length; i++) sharedU8[i] = shared[i];

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const aesKey = await crypto.subtle.importKey('raw', sharedU8, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, symKey);
      const cipher = new Uint8Array(cipherBuf);
      const payload = new Uint8Array(ownerPub.length + iv.length + cipher.length);
      payload.set(ownerPub, 0);
      payload.set(iv, ownerPub.length);
      payload.set(cipher, ownerPub.length + iv.length);

      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::market::distribute_key_to_buyer`,
        arguments: [
          tx.object(params.listingId),
          tx.object(params.dataRecordId),
          tx.pure.address(params.buyerAddress),
          tx.pure.vector('u8', Array.from(payload)),
        ]
      });
      const res = await wallet.signAndExecuteTransaction({ transaction: tx });
      const digest = res.digest;

      return { success: true, txDigest: digest };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to distribute key';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsDistributing(false);
    }
  };

  return { distributeKey, isDistributing, error };
}
