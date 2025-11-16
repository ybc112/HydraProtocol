/**
 * Browser-compatible Walrus Storage Upload Utility
 * Uses Walrus HTTP API for file uploads
 */

'use client';

export interface WalrusUploadResult {
  blobId: string;
  size: number;
  suiRefType?: string;
  suiRef?: string;
  suiBaseUrl?: string;
}

export interface WalrusConfig {
  publisherUrl?: string;
  aggregatorUrl?: string;
  epochs?: number;
}

/**
 * Upload data to Walrus storage via HTTP API
 *
 * @param file - File or Blob to upload
 * @param config - Walrus configuration
 * @returns Upload result with blob ID
 */
export async function uploadToWalrus(
  file: File | Blob,
  config?: WalrusConfig
): Promise<WalrusUploadResult> {
  try {
    // Default configuration
    const publisherUrl = config?.publisherUrl || 'https://publisher.walrus-testnet.walrus.space';
    const epochs = config?.epochs || 1;

    console.log(`📤 Uploading ${file.size} bytes to Walrus...`);

    // Upload to Walrus publisher using the correct /v1/blobs endpoint
    const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Walrus upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Parse the response
    // Walrus returns: { "newlyCreated": { "blobObject": { "id": "...", "blobId": "..." } } }
    // or { "alreadyCertified": { "blobId": "..." } }

    let blobId: string;
    let suiRefType: string | undefined;
    let suiRef: string | undefined;
    let suiBaseUrl: string | undefined;

    if (result.newlyCreated) {
      blobId = result.newlyCreated.blobObject.blobId;
      suiRefType = result.newlyCreated.blobObject.storage.type;
      suiRef = result.newlyCreated.blobObject.id;
      suiBaseUrl = result.newlyCreated.blobObject.storage.baseUrl;
    } else if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId;
      suiRefType = result.alreadyCertified.event?.txDigest;
      suiRef = result.alreadyCertified.blobObject?.id;
    } else {
      throw new Error('Unexpected Walrus response format');
    }

    console.log(`✅ Upload successful! Blob ID: ${blobId}`);

    return {
      blobId,
      size: file.size,
      suiRefType,
      suiRef,
      suiBaseUrl,
    };
  } catch (error) {
    console.error('❌ Walrus upload failed:', error);
    throw error;
  }
}

/**
 * Download data from Walrus storage
 *
 * @param blobId - Blob ID to download
 * @param config - Walrus configuration
 * @returns Downloaded data as Blob
 */
export async function downloadFromWalrus(
  blobId: string,
  config?: WalrusConfig
): Promise<Blob> {
  try {
    const aggregatorUrl = config?.aggregatorUrl || 'https://aggregator.walrus-testnet.walrus.space';

    console.log(`📥 Downloading from Walrus (Blob ID: ${blobId})...`);

    // Correct endpoint is /v1/blobs/{blobId} not /v1/{blobId}
    const response = await fetch(`${aggregatorUrl}/v1/blobs/${blobId}`);

    if (!response.ok) {
      throw new Error(`Walrus download failed: ${response.status}`);
    }

    const blob = await response.blob();

    console.log(`✅ Download successful! (${blob.size} bytes)`);

    return blob;
  } catch (error) {
    console.error('❌ Walrus download failed:', error);
    throw error;
  }
}

/**
 * Calculate SHA-256 hash of file
 *
 * @param file - File to hash
 * @returns SHA-256 hash as Uint8Array
 */
export async function calculateFileHash(file: File | Blob): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Convert file to base64 string
 *
 * @param file - File to convert
 * @returns Base64 string
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
