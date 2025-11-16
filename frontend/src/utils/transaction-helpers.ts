import { SuiClient } from '@mysten/sui/client';

/**
 * Helper function to wait for transaction to be indexed and query its details
 */
export async function waitForTransactionWithRetry(
  client: SuiClient,
  txDigest: string,
  maxRetries: number = 10,
  delayMs: number = 500
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const txDetails = await client.getTransactionBlock({
        digest: txDigest,
        options: {
          showObjectChanges: true,
          showEffects: true,
        },
      });

      if (txDetails.objectChanges && txDetails.objectChanges.length > 0) {
        console.log(`✅ Transaction indexed after ${i + 1} attempts`);
        return txDetails;
      }
    } catch (error) {
      console.log(`⏳ Attempt ${i + 1}/${maxRetries} - waiting for transaction to be indexed...`);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error(`Transaction not indexed after ${maxRetries} attempts`);
}
