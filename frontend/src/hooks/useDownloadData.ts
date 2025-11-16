/**
 * Hook for downloading purchased data from Walrus
 */

'use client';

import { useState } from 'react';
import { downloadFromWalrus } from '../utils/walrus';
import { downloadAndDecrypt } from '../utils/data-parser';

export interface DownloadResult {
  success: boolean;
  error?: string;
  blob?: Blob;
}

export interface UseDownloadDataReturn {
  download: (
    blobId: string,
    fileName?: string,
    mimeType?: string,
    dataRecordId?: string,
    buyerAddress?: string
  ) => Promise<DownloadResult>;
  isDownloading: boolean;
  progress: number;
  error: string | null;
}

/**
 * Custom hook for downloading data from Walrus
 */
export function useDownloadData(): UseDownloadDataReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Download data from Walrus and trigger browser download
   * @param blobId - Walrus blob ID
   * @param fileName - Optional filename for download (default: blob ID)
   */
  const download = async (
    blobId: string,
    fileName?: string,
    mimeType?: string,
    dataRecordId?: string,
    buyerAddress?: string
  ): Promise<DownloadResult> => {
    try {
      setIsDownloading(true);
      setProgress(0);
      setError(null);

      console.log('📥 Starting download from Walrus:', blobId);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // 使用统一的下载解密流程（支持买家链上密钥分发）
      const decryptedBuffer = await downloadAndDecrypt(blobId, undefined, { dataRecordId, buyerAddress });
      if (!decryptedBuffer) {
        throw new Error('解密失败或缺少密钥');
      }
      const outBlob = new Blob([decryptedBuffer], { type: mimeType || 'application/octet-stream' });

      clearInterval(progressInterval);
      setProgress(100);

      // Trigger browser download
      const url = URL.createObjectURL(outBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `data_${blobId.substring(0, 8)}.dat`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Download successful!');

      setTimeout(() => {
        setProgress(0);
      }, 1000);

      return {
        success: true,
        blob: outBlob
      };

    } catch (err) {
      console.error('❌ Download failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to download data';
      setError(errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    download,
    isDownloading,
    progress,
    error
  };
}
