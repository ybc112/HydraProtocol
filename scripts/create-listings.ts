/**
 * Script to create sample data listings on Sui testnet
 * This will create real listings that the frontend can query
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromBase64 } from '@mysten/sui/utils';
import * as fs from 'fs';
import * as path from 'path';

// Contract addresses (from .env or hardcoded)
const CONTRACT_ADDRESSES = {
  packageId: '0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6',
  dataRegistryId: '0x0bb7375d29902c06253100f0ddc298d582fd41b7cd0e7b9e0271dd4a767c2707',
  marketplaceId: '0x29b8127932ba0467c3a2511a0ee95cecbd1dfc388622835880b6454c3ad02201',
  zkpRegistryId: '0x7e05c6cb6c0ffa398b8b21ae8ab87b985e17af03895ff48dcf7099be32d26e41'
};

// Sample listings data
const SAMPLE_LISTINGS = [
  {
    walrusBlobId: 'blob_medical_recovery_001',
    dataHash: new Uint8Array(32).fill(1),
    dataSize: 1024 * 100, // 100KB
    dataType: 'Healthcare',
    description: 'Hospital Patient Recovery Data - Anonymized recovery time data from 1000+ patients',
    encrypted: true,
    isPublic: false,
    price: 100_000_000_000, // 100 SUI in MIST
  },
  {
    walrusBlobId: 'blob_clinical_trial_002',
    dataHash: new Uint8Array(32).fill(2),
    dataSize: 1024 * 500, // 500KB
    dataType: 'Healthcare',
    description: 'Clinical Trial Results Dataset - Phase 3 trial outcomes with demographics',
    encrypted: true,
    isPublic: false,
    price: 250_000_000_000, // 250 SUI
  },
  {
    walrusBlobId: 'blob_defi_transactions_003',
    dataHash: new Uint8Array(32).fill(3),
    dataSize: 1024 * 200, // 200KB
    dataType: 'Finance',
    description: 'DeFi Transaction Patterns - Sui blockchain wallet behavior and swap data',
    encrypted: true,
    isPublic: false,
    price: 75_000_000_000, // 75 SUI
  },
  {
    walrusBlobId: 'blob_supply_chain_004',
    dataHash: new Uint8Array(32).fill(4),
    dataSize: 1024 * 150, // 150KB
    dataType: 'Logistics',
    description: 'Supply Chain Logistics Data - Real-world delivery times and route optimization',
    encrypted: true,
    isPublic: false,
    price: 150_000_000_000, // 150 SUI
  }
];

async function main() {
  console.log('\n🚀 Creating Sample Data Listings on Sui Testnet\n');
  console.log('='.repeat(70));

  // Initialize Sui client
  const client = new SuiClient({
    url: 'https://fullnode.testnet.sui.io:443'
  });

  // Load keypair from environment or generate new one
  let keypair: Ed25519Keypair;

  const keyPath = path.join(process.env.HOME || '', '.sui', 'sui_config', 'sui.keystore');

  try {
    // Try to read from Sui keystore
    const keystoreData = fs.readFileSync(keyPath, 'utf-8');
    const keys = JSON.parse(keystoreData);

    if (keys.length > 0) {
      // Use first key
      const keyData = keys[0];
      const privateKey = fromBase64(keyData);
      keypair = Ed25519Keypair.fromSecretKey(privateKey.slice(1));
      console.log('✓ Using existing Sui wallet');
    } else {
      throw new Error('No keys in keystore');
    }
  } catch (error) {
    console.log('⚠️  No existing wallet found, generating new keypair');
    keypair = new Ed25519Keypair();
    console.log('✓ New keypair generated');
  }

  const address = keypair.getPublicKey().toSuiAddress();
  console.log(`📍 Wallet Address: ${address}\n`);

  // Check balance
  const balance = await client.getBalance({ owner: address });
  const suiBalance = Number(balance.totalBalance) / 1e9;
  console.log(`💰 Wallet Balance: ${suiBalance.toFixed(4)} SUI`);

  if (suiBalance < 1) {
    console.log('\n⚠️  WARNING: Low balance! You need at least 1 SUI to create listings.');
    console.log(`   Get testnet SUI from: https://discord.com/channels/916379725201563759/1037811694564560966`);
    console.log(`   Or use: curl --location --request POST 'https://faucet.testnet.sui.io/gas' --header 'Content-Type: application/json' --data-raw '{ "FixedAmountRequest": { "recipient": "${address}" } }'`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📝 Creating Data Records and Listings...\n');

  let successCount = 0;
  let dataRecordIds: string[] = [];

  for (let i = 0; i < SAMPLE_LISTINGS.length; i++) {
    const listing = SAMPLE_LISTINGS[i];

    try {
      console.log(`[${i + 1}/${SAMPLE_LISTINGS.length}] Creating: ${listing.description.substring(0, 50)}...`);

      // Step 1: Register data
      const registerTx = new Transaction();

      registerTx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::data_registry::register_data`,
        arguments: [
          registerTx.object(CONTRACT_ADDRESSES.dataRegistryId),
          registerTx.pure.string(listing.walrusBlobId),
          registerTx.pure(Array.from(listing.dataHash)),
          registerTx.pure.u64(listing.dataSize),
          registerTx.pure.string(listing.dataType),
          registerTx.pure.string(listing.description),
          registerTx.pure.bool(listing.encrypted),
          registerTx.pure.bool(listing.isPublic),
          registerTx.object('0x6'), // Clock
        ],
      });

      const registerResult = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: registerTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Extract created DataRecord ID
      const created = registerResult.objectChanges?.filter(
        (change) => change.type === 'created'
      );

      const dataRecordId = created?.find(obj =>
        obj.type === 'created' && obj.objectType.includes('DataRecord')
      )?.objectId;

      if (!dataRecordId) {
        console.log(`  ❌ Failed to get DataRecord ID`);
        continue;
      }

      dataRecordIds.push(dataRecordId);
      console.log(`  ✓ DataRecord created: ${dataRecordId.slice(0, 10)}...`);

      // Step 2: List data on marketplace
      const listTx = new Transaction();

      listTx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::market::list_data`,
        arguments: [
          listTx.object(CONTRACT_ADDRESSES.marketplaceId),
          listTx.object(dataRecordId),
          listTx.pure.u64(listing.price),
          listTx.pure.string(listing.dataType),
          listTx.pure.string(listing.description),
          listTx.object('0x6'), // Clock
        ],
      });

      const listResult = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: listTx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      const listingId = listResult.objectChanges?.find(obj =>
        obj.type === 'created' && 'objectType' in obj && obj.objectType.includes('DataListing')
      )?.objectId;

      if (listResult.effects?.status?.status === 'success') {
        console.log(`  ✓ Listed on marketplace: ${listingId?.slice(0, 10) || 'unknown'}...`);
        console.log(`  💰 Price: ${listing.price / 1e9} SUI`);
        successCount++;
      } else {
        console.log(`  ❌ Failed to list: ${listResult.effects?.status?.error || 'Unknown error'}`);
      }

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  console.log('='.repeat(70));
  console.log(`\n✨ Completed! Successfully created ${successCount}/${SAMPLE_LISTINGS.length} listings\n`);

  if (successCount > 0) {
    console.log('📋 Next steps:');
    console.log('   1. Refresh your frontend to see the new listings');
    console.log('   2. Listings should now appear in the marketplace');
    console.log('   3. You can purchase them using your Sui wallet');
  }

  console.log('\n📊 Created DataRecord IDs:');
  dataRecordIds.forEach((id, index) => {
    console.log(`   ${index + 1}. ${id}`);
  });
  console.log('');
}

main().catch(error => {
  console.error('\n❌ Script failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
