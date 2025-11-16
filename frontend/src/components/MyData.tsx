'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { useMyPurchases } from '../hooks/useMyPurchases';
import { useDownloadData } from '../hooks/useDownloadData';

export function MyData() {
  const wallet = useWallet();
  const { purchases, loading, error, refetch } = useMyPurchases();
  const { download, isDownloading, progress } = useDownloadData();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (blobId: string, title: string, purchaseId: string) => {
    setDownloadingId(purchaseId);
    const fileName = `${title.replace(/\s+/g, '_')}.dat`;
    await download(blobId, fileName);
    setDownloadingId(null);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: number) => {
    if (!expiresAt) return false;
    return Date.now() > expiresAt;
  };

  if (!wallet.connected) {
    return (
      <section id="my-data" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              我的数据
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              请先连接钱包查看您购买的数据
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="my-data" className="py-20 px-6 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            我的已购数据
          </h2>
          <p className="text-xl text-gray-600">
            查看和下载您购买的所有数据
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : purchases.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <svg className="mx-auto h-24 w-24 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xl text-gray-600 mb-4">您还没有购买任何数据</p>
            <a
              href="#marketplace"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              前往市场浏览
            </a>
          </div>
        ) : (
          /* Purchases List */
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const expired = isExpired(purchase.expiresAt);
              const isDownloadingThis = downloadingId === purchase.purchaseId;

              return (
                <div
                  key={purchase.purchaseId}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    {/* Left: Data Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{purchase.title}</h3>
                        <span className="px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                          {purchase.dataType}
                        </span>
                        {expired && (
                          <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                            已过期
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4">{purchase.description}</p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">购买价格:</span>
                          <span className="ml-2 font-semibold text-blue-600">{purchase.price}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">购买时间:</span>
                          <span className="ml-2 font-semibold">{formatDate(purchase.purchasedAt)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">访问期限:</span>
                          <span className={`ml-2 font-semibold ${expired ? 'text-red-600' : 'text-green-600'}`}>
                            {formatDate(purchase.expiresAt)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Blob ID:</span>
                          <span className="ml-2 font-mono text-xs">{purchase.blobId.substring(0, 16)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Download Button */}
                    <div className="ml-6 flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleDownload(purchase.blobId, purchase.title, purchase.purchaseId)}
                        disabled={isDownloadingThis || expired}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                          isDownloadingThis
                            ? 'bg-gray-300 text-gray-600 cursor-wait'
                            : expired
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-lg hover:scale-105'
                        }`}
                      >
                        {isDownloadingThis ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>下载中... {progress}%</span>
                          </>
                        ) : expired ? (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>已过期</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>下载数据</span>
                          </>
                        )}
                      </button>

                      {!expired && (
                        <p className="text-xs text-gray-500 text-right">
                          剩余 {Math.ceil((purchase.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))} 天
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh Button */}
        {purchases.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-6 py-2 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              {loading ? '刷新中...' : '刷新列表'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
