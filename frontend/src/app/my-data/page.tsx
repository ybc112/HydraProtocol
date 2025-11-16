'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { useMyPurchases } from '../../hooks/useMyPurchases';
import { useAutoDistributeKeys } from '../../hooks/useAutoDistributeKeys';
import { useSellerListings } from '../../hooks/useSellerListings';
import { useKeyDistributionHistory } from '../../hooks/useKeyDistributionHistory';
import { useDistributeKey } from '../../hooks/useDistributeKey';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_ADDRESSES } from '../../config/hydra';
import { x25519 } from '@noble/curves/ed25519';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function MyDataPage() {
  const wallet = useWallet();
  const { purchases, loading, error, refetch } = useMyPurchases();
  const [autoDist, setAutoDist] = useState(true);
  const { running: autoRunning, lastError: autoError } = useAutoDistributeKeys(autoDist);
  const { listings: sellerListings } = useSellerListings();
  const [selListingId, setSelListingId] = useState('');
  const [selDataRecordId, setSelDataRecordId] = useState('');
  const [selBuyer, setSelBuyer] = useState('');
  const { items: distHistory, loading: distLoading } = useKeyDistributionHistory(selDataRecordId);
  const { distributeKey, isDistributing, error: distributeError } = useDistributeKey();
  const [distResult, setDistResult] = useState<string | null>(null);
  const [distErrorMsg, setDistErrorMsg] = useState<string | null>(null);

  const handleRegisterMyPubkey = async () => {
    if (!wallet.connected || !wallet.account) return;
    try {
      const addr = wallet.account.address;
      const privKeyB64 = localStorage.getItem(`hydra:encPrivKey:${addr}`);
      let priv: Uint8Array;
      if (!privKeyB64) {
        priv = x25519.utils.randomPrivateKey();
        const privB64 = btoa(String.fromCharCode(...priv));
        localStorage.setItem(`hydra:encPrivKey:${addr}`, privB64);
      } else {
        priv = Uint8Array.from(atob(privKeyB64), c => c.charCodeAt(0));
      }
      const pub = x25519.getPublicKey(priv);
      const tx = new Transaction();
      tx.moveCall({
        target: `${CONTRACT_ADDRESSES.packageId}::data_registry::register_user_pubkey`,
        arguments: [
          tx.object(CONTRACT_ADDRESSES.dataRegistryId!),
          tx.pure.vector('u8', Array.from(pub)),
        ],
      });
      await wallet.signAndExecuteTransaction({ transaction: tx });
      setDistErrorMsg(null);
    } catch (e) {
      setDistErrorMsg(e instanceof Error ? e.message : 'Failed to register public key');
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: number) => {
    if (!expiresAt || expiresAt === 0) return false;
    return Date.now() > expiresAt;
  };

  const getRemainingDays = (expiresAt: number) => {
    if (!expiresAt || expiresAt === 0) return 99999;
    const days = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };


  return (
    <main className="min-h-screen bg-slate-900">
      <Header />

      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      <div className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
              My Purchased Data
            </h1>
            <p className="text-xl text-gray-400">
              View and download all your purchased datasets
            </p>
          </div>

          {/* Wallet Not Connected */}
          {!wallet.connected ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-400 mb-6">
                  Please connect your wallet to view your purchased datasets
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="max-w-6xl mx-auto mb-6 flex items-center gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <input type="checkbox" checked={autoDist} onChange={e => setAutoDist(e.target.checked)} />
                  Auto-distribute Keys (when seller wallet is online)
                </label>
                <span className={`text-sm ${autoRunning ? 'text-emerald-400' : 'text-gray-400'}`}>{autoRunning ? 'Running' : 'Idle'}</span>
                {autoError && <span className="text-sm text-yellow-400">{autoError}</span>}
                <button onClick={handleRegisterMyPubkey} className="ml-auto px-3 py-2 rounded bg-slate-800 border border-slate-600 text-gray-200 hover:bg-slate-700">Register My Public Key</button>
              </div>
              {/* Key Distribution */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-6xl mx-auto mb-8">
                <h2 className="text-xl font-bold text-white mb-2">Distribute Keys to Buyers</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Instructions:
                  <span className="ml-2">Listing ID = Listed Object ID</span>
                  <span className="ml-4">DataRecord ID = Data Record Object ID (auto-filled)</span>
                  <span className="ml-4">Buyer Address = Buyer's Address (select from purchase events)</span>
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <select className="px-4 py-2 rounded bg-slate-900 border border-slate-700 text-white w-full h-10" value={selListingId} onChange={e => {
                    const id = e.target.value; setSelListingId(id);
                    const m = sellerListings.find(l => l.listingId === id);
                    setSelDataRecordId(m ? m.dataRecordId : '');
                    setSelBuyer('');
                  }}>
                    <option value="">Select Listing</option>
                    {sellerListings.map(l => (
                      <option key={l.listingId} value={l.listingId}>{l.listingId.substring(0,10)}... / {l.dataRecordId.substring(0,10)}...</option>
                    ))}
                  </select>
                  <input className="px-4 py-2 rounded bg-slate-900 border border-slate-700 text-white w-full h-10" placeholder="DataRecord ID" value={selDataRecordId} readOnly />
                  <select className="px-4 py-2 rounded bg-slate-900 border border-slate-700 text-white w-full h-10" value={selBuyer} onChange={e => setSelBuyer(e.target.value)}>
                    <option value="">Select Buyer Address</option>
                    {(sellerListings.find(l => l.listingId === selListingId)?.buyers || []).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={async () => {
                    setDistErrorMsg(null);
                    const res = await distributeKey({ listingId: selListingId, dataRecordId: selDataRecordId, buyerAddress: selBuyer });
                    if (res.success) {
                      setDistResult(res.txDigest || '');
                    } else {
                      setDistErrorMsg(res.error || 'Distribution failed');
                    }
                  }} disabled={isDistributing || !selListingId || !selDataRecordId || !selBuyer} className={`px-4 py-2 rounded ${isDistributing ? 'bg-slate-700 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>Distribute Key</button>
                  {distResult && <span className="text-emerald-400 font-mono text-sm">TX: {distResult.substring(0,20)}...</span>}
                  {(distributeError || distErrorMsg) && <span className="text-red-400 text-sm">{distErrorMsg || distributeError}</span>}
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Distribution History</h3>
                  {distLoading ? (
                    <div className="text-gray-400">Loading...</div>
                  ) : distHistory.length === 0 ? (
                    <div className="text-gray-400">No records</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left px-2 py-2">Buyer</th>
                            <th className="text-left px-2 py-2">Time</th>
                            <th className="text-left px-2 py-2">Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distHistory.map((h, i) => (
                            <tr key={i} className="border-t border-slate-700">
                              <td className="px-2 py-2 text-gray-200 font-mono">{h.buyer}</td>
                              <td className="px-2 py-2 text-gray-300">{h.timestamp ? new Date(h.timestamp).toLocaleString() : 'N/A'}</td>
                              <td className="px-2 py-2 text-emerald-400 font-mono">{h.txDigest ? h.txDigest.substring(0,20)+'...' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="max-w-4xl mx-auto mb-6">
                  <div className="bg-red-900/20 border border-red-700 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                      <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-300 font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mb-4"></div>
                  <p className="text-lg text-gray-300">Loading your purchases...</p>
                </div>
              ) : purchases.length === 0 ? (
                /* Empty State */
                <div className="max-w-2xl mx-auto">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                    <svg className="mx-auto h-24 w-24 text-gray-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h3>
                    <p className="text-gray-400 mb-6">
                      You haven't purchased any datasets yet. Browse the marketplace to get started!
                    </p>
                    <a
                      href="/marketplace"
                      className="inline-block px-8 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-all"
                    >
                      Browse Marketplace
                    </a>
                  </div>
                </div>
              ) : (
                /* Purchases Grid */
                <div className="max-w-6xl mx-auto">
                  <div className="grid gap-6">
                    {purchases.map((purchase) => {
                      const expired = isExpired(purchase.expiresAt);
                      const remainingDays = getRemainingDays(purchase.expiresAt);

                      return (
                        <div
                          key={purchase.purchaseId}
                          className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all"
                        >
                          <div className="p-6">
                            {/* Title and Tags */}
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                              <h3 className="text-2xl font-bold text-white">
                                {purchase.title || 'Untitled Dataset'}
                              </h3>
                              <span className="px-3 py-1 text-sm font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 whitespace-nowrap">
                                {purchase.dataType || 'Data'}
                              </span>
                              {expired && (
                                <span className="px-3 py-1 text-sm font-semibold bg-red-500/20 text-red-300 rounded-full border border-red-500/30 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  Expired
                                </span>
                              )}
                              {!expired && remainingDays <= 7 && remainingDays < 99999 && (
                                <span className="px-3 py-1 text-sm font-semibold bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
                                  Expires Soon
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-gray-400 mb-4 line-clamp-2">{purchase.description || 'No description available'}</p>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-emerald-400 font-medium mb-1">Purchase Price</p>
                                <p className="text-lg font-bold text-emerald-300">{purchase.price || '0 SUI'}</p>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">Purchased On</p>
                                <p className="text-sm font-semibold text-gray-300">{formatDate(purchase.purchasedAt)}</p>
                              </div>
                              <div className={`border rounded-lg p-3 ${expired ? 'bg-red-900/20 border-red-700' : 'bg-emerald-900/20 border-emerald-700'}`}>
                                <p className={`text-xs font-medium mb-1 ${expired ? 'text-red-400' : 'text-emerald-400'}`}>
                                  Access Until
                                </p>
                                <p className={`text-sm font-semibold ${expired ? 'text-red-300' : 'text-emerald-300'}`}>
                                  {purchase.expiresAt && purchase.expiresAt > 0 ? formatDate(purchase.expiresAt) : 'Unlimited'}
                                </p>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">Blob ID</p>
                                <p className="text-xs font-mono text-gray-300 truncate">
                                  {purchase.blobId ? purchase.blobId.substring(0, 20) + '...' : 'N/A'}
                                </p>
                              </div>
                            </div>

                            {/* Access Info */}
                            {!expired && remainingDays < 99999 && (
                              <div className="mt-4 text-center">
                                <p className="text-sm font-semibold text-emerald-400">
                                  {remainingDays} days remaining
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Refresh Button */}
                  <div className="text-center mt-8">
                    <button
                      onClick={refetch}
                      disabled={loading}
                      className="px-6 py-3 border-2 border-emerald-500 text-emerald-400 font-semibold rounded-lg hover:bg-emerald-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                    >
                      <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {loading ? 'Refreshing...' : 'Refresh List'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />

    </main>
  );
}
