"use client";
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';
import { x25519 } from '@noble/curves/ed25519';

export function useAutoDistributeKeys(enabled: boolean) {
  const wallet = useWallet();
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const distributedRef = useRef<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!enabled || !wallet.connected || !wallet.account) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunning(false);
      return;
    }

    const config = getHydraConfig();
    const client = new SuiClient({ url: config.sui?.network === 'testnet' ? 'https://fullnode.testnet.sui.io:443' : 'https://fullnode.mainnet.sui.io:443' });

    const tick = async () => {
      try {
        setRunning(true);
        setLastError(null);

        const owner = wallet.account!.address;
        const listings = await client.getOwnedObjects({
          owner,
          filter: { StructType: `${CONTRACT_ADDRESSES.packageId}::market::DataListing` },
          options: { showContent: true }
        });

        for (const obj of listings.data) {
          if (!obj.data?.content || !('fields' in obj.data.content)) continue;
          const fields = obj.data.content.fields as any;
          const listingId = obj.data.objectId;
          const dataRecordId = fields.data_record_id as string;

          const purchasers = fields.purchasers || {};
          const alreadyMap = distributedRef.current[listingId] || (distributedRef.current[listingId] = {});

          // Query existing KeyDistributed events to avoid duplicates
          const kdEvents = await client.queryEvents({ query: { MoveEventType: `${CONTRACT_ADDRESSES.packageId}::data_registry::KeyDistributed` }, limit: 200, order: 'descending' });

          for (const [buyer, bought] of Object.entries(purchasers)) {
            if (!bought) continue;
            if (alreadyMap[buyer]) continue;

            // Check if event already exists
            const found = kdEvents.data.some(ev => {
              const pj: any = ev.parsedJson;
              return pj && pj.data_id === dataRecordId && pj.buyer === buyer;
            });
            if (found) { alreadyMap[buyer] = true; continue; }

            // Distribute
            const recordObj = await client.getObject({ id: dataRecordId, options: { showContent: true } });
            if (!recordObj.data?.content || !('fields' in recordObj.data.content)) continue;
            const rfields = recordObj.data.content.fields as any;
            const blobId = rfields.walrus_blob_id as string;

            const keyB64 = typeof window !== 'undefined' ? localStorage.getItem(`hydra:blobKey:${blobId}`) : null;
            if (!keyB64) { setLastError(`missing local key for ${blobId}`); continue; }
            const symKey = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));

            // Find buyer pubkey
            const ukEvents = await client.queryEvents({ query: { MoveEventType: `${CONTRACT_ADDRESSES.packageId}::data_registry::UserKeyRegistered` }, limit: 200, order: 'descending' });
            let buyerPub: Uint8Array | null = null;
            for (const ev of ukEvents.data) {
              const pj: any = ev.parsedJson;
              if (pj && pj.user === buyer && pj.pubkey) { buyerPub = new Uint8Array(pj.pubkey as number[]); break; }
            }
            if (!buyerPub) { setLastError(`missing buyer pubkey ${buyer}`); continue; }

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
                tx.object(listingId),
                tx.object(dataRecordId),
                tx.pure.address(buyer),
                tx.pure.vector('u8', Array.from(payload)),
              ]
            });
            await wallet.signAndExecuteTransaction({ transaction: tx });
            alreadyMap[buyer] = true;
          }
        }
      } catch (e) {
        setLastError(e instanceof Error ? e.message : 'auto distribute error');
      }
    };

    tick();
    timerRef.current = setInterval(tick, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [enabled, wallet.connected, wallet.account?.address]);

  return { running, lastError };
}