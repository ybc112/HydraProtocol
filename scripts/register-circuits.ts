#!/usr/bin/env tsx

/**
 * Register ZKP circuits to the new deployed ZKPRegistry
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Contract addresses (update these with your deployed addresses)
const PACKAGE_ID = '0xc06de3e29a173a088c5b5f75632e2ef67e9ab1d09e65336589a514d79f1b010d';
const ZKP_REGISTRY_ID = '0x2a5e682613f69ffec125e7accf407abdc11b8289f4d298c019b595466ab698cb';

// Curve types
const CURVE_BN254 = 1;
const CURVE_BLS12_381 = 2;

async function registerCircuit(
  client: SuiClient,
  keypair: Ed25519Keypair,
  circuitName: string,
  vkPath: string,
  description: string
) {
  console.log(`\n📝 Registering circuit: ${circuitName}`);
  
  // Check if verification key file exists
  if (!existsSync(vkPath)) {
    console.error(`❌ Verification key not found: ${vkPath}`);
    console.log(`   Please build circuits first: cd circuits && ./build_circuits.sh`);
    return false;
  }

  try {
    // Read verification key
    const vkJson = JSON.parse(readFileSync(vkPath, 'utf-8'));
    const vkStr = JSON.stringify(vkJson);
    const vkBytes = Array.from(Buffer.from(vkStr, 'utf-8'));

    console.log(`   VK size: ${vkBytes.length} bytes`);

    // Create transaction
    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::zkp_verifier::register_circuit`,
      arguments: [
        tx.object(ZKP_REGISTRY_ID),              // registry
        tx.pure.string(circuitName),             // circuit_name
        tx.pure.u8(CURVE_BN254),                 // curve_type
        tx.pure.vector('u8', vkBytes),           // vk_data
        tx.pure.string(description),             // description
        tx.object('0x6'),                        // clock
      ],
    });

    // Execute
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.effects?.status?.status === 'success') {
      console.log(`   ✅ Registered successfully`);
      console.log(`   📋 Transaction: ${result.digest}`);
      return true;
    } else {
      console.error(`   ❌ Transaction failed:`, result.effects?.status?.error);
      return false;
    }
  } catch (error: any) {
    console.error(`   ❌ Failed to register:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Registering ZKP Circuits to HydraProtocol');
  console.log('='.repeat(50));
  console.log(`Package ID: ${PACKAGE_ID}`);
  console.log(`ZKP Registry ID: ${ZKP_REGISTRY_ID}`);

  // Initialize client
  const client = new SuiClient({
    url: 'https://fullnode.testnet.sui.io:443'
  });

  // Load keypair from environment
  const privateKey = process.env.SUI_PRIVATE_KEY;
  if (!privateKey) {
    console.error('\n❌ Error: SUI_PRIVATE_KEY environment variable not set');
    console.log('   Export your private key: export SUI_PRIVATE_KEY=suiprivkey1...');
    process.exit(1);
  }

  let keypair: Ed25519Keypair;
  try {
    // Support both Bech32 (suiprivkey1...) and hex (0x...) formats
    if (privateKey.startsWith('suiprivkey1')) {
      keypair = Ed25519Keypair.fromSecretKey(privateKey);
    } else {
      const privateKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
      keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    }
  } catch (error: any) {
    console.error('\n❌ Error: Invalid private key format');
    console.error('   Message:', error.message);
    process.exit(1);
  }
  
  const address = keypair.toSuiAddress();

  console.log(`\n👤 Sender: ${address}`);

  // Get balance
  const balance = await client.getBalance({ owner: address });
  console.log(`💰 Balance: ${(parseInt(balance.totalBalance) / 1e9).toFixed(4)} SUI`);

  if (parseInt(balance.totalBalance) < 1e8) {
    console.error('\n❌ Insufficient balance. Need at least 0.1 SUI for gas.');
    process.exit(1);
  }

  // Circuit paths
  const circuitsDir = resolve(__dirname, '../circuits/build');

  const circuits = [
    {
      name: 'average',
      vkPath: resolve(circuitsDir, 'average/verification_key.json'),
      description: 'Average computation circuit - computes average of private data points'
    },
    {
      name: 'threshold',
      vkPath: resolve(circuitsDir, 'threshold/verification_key.json'),
      description: 'Threshold query circuit - counts data points above a threshold'
    }
  ];

  // Register circuits
  let successCount = 0;
  for (const circuit of circuits) {
    const success = await registerCircuit(
      client,
      keypair,
      circuit.name,
      circuit.vkPath,
      circuit.description
    );
    if (success) successCount++;
    
    // Wait a bit between transactions
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Registration complete: ${successCount}/${circuits.length} circuits registered`);
  
  if (successCount < circuits.length) {
    console.log('\n⚠️ Some circuits failed to register. Please check the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);

