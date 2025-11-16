/**
 * Browser-compatible ZKP Proof Generator
 * Uses snarkjs in browser environment with circuit files from public directory
 */

'use client';

// @ts-ignore - snarkjs types
const snarkjs = require('snarkjs');

export interface ProofResult {
  proof: any;
  publicSignals: string[];
}

/**
 * Generate ZKP proof for Average circuit
 *
 * @param data - Array of data values (must have 3 elements for current circuit)
 * @returns Proof and public signals
 */
export async function generateAverageProof(data: number[]): Promise<ProofResult> {
  try {
    console.log('🔐 Generating Average ZKP proof...', { data });

    // Validate input
    if (data.length !== 3) {
      throw new Error(`Average circuit expects 3 data points, got ${data.length}`);
    }

    // Prepare inputs for the circuit
    const inputs = {
      data: data.map(d => String(d))
    };

    console.log('Circuit inputs:', inputs);

    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      '/circuits/average/average.wasm',
      '/circuits/average/circuit_final.zkey'
    );

    console.log('✅ Average proof generated successfully');
    console.log('Public signals:', publicSignals);

    return { proof, publicSignals };

  } catch (error: any) {
    console.error('❌ Failed to generate average proof:', error);
    throw new Error(`Average proof generation failed: ${error.message}`);
  }
}

/**
 * Generate ZKP proof for Threshold circuit
 *
 * @param data - Array of data values (must have 10 elements for current circuit)
 * @param threshold - Threshold value
 * @param salt - Random salt for commitment
 * @returns Proof and public signals
 */
export async function generateThresholdProof(
  data: number[],
  threshold: number,
  salt?: number
): Promise<ProofResult> {
  try {
    console.log('🔐 Generating Threshold ZKP proof...', {
      dataLength: data.length,
      threshold,
      salt: salt || 'auto-generated'
    });

    // Validate input
    if (data.length !== 10) {
      throw new Error(`Threshold circuit expects 10 data points, got ${data.length}`);
    }

    // Generate random salt if not provided
    const finalSalt = salt || Math.floor(Math.random() * 1000000);

    // Prepare inputs for the circuit
    const inputs = {
      data: data.map(d => String(d)),
      threshold: String(threshold),
      salt: String(finalSalt)
    };

    console.log('Circuit inputs:', { ...inputs, data: `[${inputs.data.length} values]` });

    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      '/circuits/threshold/threshold.wasm',
      '/circuits/threshold/circuit_final.zkey'
    );

    console.log('✅ Threshold proof generated successfully');
    console.log('Public signals:', publicSignals);

    return { proof, publicSignals };

  } catch (error: any) {
    console.error('❌ Failed to generate threshold proof:', error);
    throw new Error(`Threshold proof generation failed: ${error.message}`);
  }
}

/**
 * Verify ZKP proof
 *
 * @param circuitType - Type of circuit ('average' or 'threshold')
 * @param proof - The proof to verify
 * @param publicSignals - Public signals
 * @returns True if proof is valid
 */
export async function verifyProof(
  circuitType: 'average' | 'threshold',
  proof: any,
  publicSignals: string[]
): Promise<boolean> {
  try {
    console.log(`🔍 Verifying ${circuitType} proof...`);

    // Load verification key
    const vkeyResponse = await fetch(`/circuits/${circuitType}/verification_key.json`);
    const vkey = await vkeyResponse.json();

    // Verify proof
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);

    console.log(`${isValid ? '✅' : '❌'} Proof verification ${isValid ? 'succeeded' : 'failed'}`);

    return isValid;

  } catch (error: any) {
    console.error('❌ Proof verification failed:', error);
    return false;
  }
}

/**
 * Encode proof to bytes for smart contract submission
 *
 * @param proof - The proof object from snarkjs
 * @returns Uint8Array representation of the proof
 */
export function encodeProofToBytes(proof: any): Uint8Array {
  const toBytes32 = (s: string): number[] => {
    const v = BigInt(s);
    const arr = new Array(32).fill(0);
    let x = v;
    for (let i = 0; i < 32; i++) { arr[i] = Number(x & BigInt(0xff)); x >>= BigInt(8); }
    return arr;
  };

  const out: number[] = [];
  for (const s of proof.pi_a.slice(0, 2)) out.push(...toBytes32(s));
  const b = proof.pi_b;
  out.push(...toBytes32(b[0][0]));
  out.push(...toBytes32(b[0][1]));
  out.push(...toBytes32(b[1][0]));
  out.push(...toBytes32(b[1][1]));
  for (const s of proof.pi_c.slice(0, 2)) out.push(...toBytes32(s));
  return new Uint8Array(out);
}

/**
 * Encode public signals to bytes for smart contract submission
 *
 * @param publicSignals - Array of public signals as strings
 * @returns Uint8Array representation of the public signals
 */
export function encodePublicSignalsToBytes(publicSignals: string[]): Uint8Array {
  const bytes: number[] = [];
  for (const s of publicSignals) {
    const v = BigInt(s);
    const arr = new Uint8Array(32);
    let x = v;
    for (let i = 0; i < 32; i++) {
      arr[i] = Number(x & BigInt(0xff));
      x = x >> BigInt(8);
    }
    for (let i = 0; i < 32; i++) {
      bytes.push(arr[i]);
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Parse public signals to extract computation result
 *
 * @param circuitType - Type of circuit
 * @param publicSignals - Public signals from proof
 * @returns Parsed result object
 */
export function parsePublicSignals(
  circuitType: 'average' | 'threshold',
  publicSignals: string[]
): { result: string; commitment: string } {
  if (circuitType === 'average') {
    // Average circuit outputs: [avg, commitment, data[0], data[1], data[2]]
    const avgBigInt = BigInt(publicSignals[0]);
    const commitmentBigInt = BigInt(publicSignals[1]);

    // Convert field element to number
    // Check if it's a reasonable value (< 1 million) or needs field arithmetic
    let avgValue: number;
    const BN254_FIELD = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // If value is larger than half the field, it might be negative (field arithmetic)
    if (avgBigInt > BN254_FIELD / BigInt(2)) {
      // Negative value in field representation
      avgValue = Number(avgBigInt - BN254_FIELD);
    } else if (avgBigInt < BigInt(1000000)) {
      // Small positive value - use directly
      avgValue = Number(avgBigInt);
    } else {
      // Large value - might be scaled or abbreviated
      const avgStr = avgBigInt.toString();
      return {
        result: `Average: ${avgStr.substring(0, 8)}...${avgStr.substring(avgStr.length - 4)} (field element)`,
        commitment: commitmentBigInt.toString().substring(0, 16) + '...'
      };
    }

    return {
      result: `Average: ${avgValue.toFixed(2)}`,
      commitment: commitmentBigInt.toString().substring(0, 16) + '...'
    };
  } else if (circuitType === 'threshold') {
    // Threshold circuit outputs: [count, commitment]
    const countBigInt = BigInt(publicSignals[0]);
    const commitmentBigInt = BigInt(publicSignals[1]);

    let countDisplay: string;
    if (countBigInt < BigInt(1000000)) {
      countDisplay = countBigInt.toString();
    } else {
      const countStr = countBigInt.toString();
      countDisplay = countStr.substring(0, 8) + '...' + countStr.substring(countStr.length - 4);
    }

    const commitmentStr = commitmentBigInt.toString();
    const commitmentDisplay = commitmentStr.substring(0, 16) + '...';

    return {
      result: `Count above threshold: ${countDisplay}`,
      commitment: commitmentDisplay
    };
  }

  return {
    result: 'Unknown',
    commitment: publicSignals[0] ? publicSignals[0].substring(0, 16) + '...' : '0'
  };
}

/**
 * Generate mock data for testing
 *
 * @param circuitType - Type of circuit
 * @returns Mock data array
 */
export function generateMockData(circuitType: 'average' | 'threshold'): number[] {
  if (circuitType === 'average') {
    // Generate 3 random numbers for average circuit
    return [
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 100)
    ];
  } else {
    // Generate 10 random numbers for threshold circuit
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 100));
  }
}
