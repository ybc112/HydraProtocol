'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { useComputationResults } from '../../hooks/useComputationResults';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ResultsPage() {
  const wallet = useWallet();
  const { results, loading, error, refetch } = useComputationResults();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const parseMetadata = (metadata: string) => {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  };

  const toggleExpand = (resultId: string) => {
    setExpandedId(expandedId === resultId ? null : resultId);
  };

  const getCircuitIcon = (circuitName: string) => {
    if (circuitName.includes('average')) {
      return '📊';
    } else if (circuitName.includes('threshold')) {
      return '🎯';
    }
    return '🔐';
  };

  return (
    <main className="min-h-screen bg-slate-900">
      <Header />

      {/* Background Pattern */}
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
            <div className="inline-block mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 font-semibold">📈 Computation History</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
              ZKP Computation Results
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              View all your zero-knowledge proof computations and their verification status
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
                <p className="text-gray-400">
                  Please connect your wallet to view your computation results
                </p>
              </div>
            </div>
          ) : (
            <>
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
                  <p className="text-lg text-gray-300">Loading computation results...</p>
                </div>
              ) : results.length === 0 ? (
                /* Empty State */
                <div className="max-w-2xl mx-auto">
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
                    <svg className="mx-auto h-24 w-24 text-gray-500 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-2xl font-bold text-white mb-2">No Computations Yet</h3>
                    <p className="text-gray-400 mb-6">
                      You haven't performed any ZKP computations yet. Start computing on your data!
                    </p>
                    <a
                      href="/compute"
                      className="inline-block px-8 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-all"
                    >
                      Start Computing
                    </a>
                  </div>
                </div>
              ) : (
                /* Results List */
                <div className="max-w-6xl mx-auto">
                  <div className="grid gap-6">
                    {results.map((result) => {
                      const metadata = parseMetadata(result.metadata);
                      const isExpanded = expandedId === result.resultId;

                      return (
                        <div
                          key={result.resultId}
                          className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all"
                        >
                          <div className="p-6">
                            {/* Header */}
                            <div className="flex flex-col lg:flex-row items-start justify-between gap-4 mb-4">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-3xl">{getCircuitIcon(result.circuitName)}</span>
                                <div>
                                  <h3 className="text-2xl font-bold text-white capitalize">
                                    {(metadata && metadata.title) ? metadata.title : `${result.circuitName} Computation`}
                                  </h3>
                                  <p className="text-sm text-gray-400">
                                    Submitted {formatDate(result.submittedAt)}
                                  </p>
                                </div>
                              </div>

                              {/* Verification Status */}
                              <div className="flex items-center gap-2">
                                {result.verified ? (
                                  <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Verified
                                  </span>
                                ) : (
                                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30 flex items-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Result Summary */}
                            {metadata && metadata.result && (
                              <div className="bg-emerald-900/20 border border-emerald-500 rounded-lg p-4 mb-4">
                                <p className="text-sm text-emerald-400 font-medium mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Computation Result
                                </p>
                                <p className="text-2xl font-bold text-white mb-2">{metadata.result}</p>
                                {metadata.dataPreview && (
                                  <div className="mt-3 pt-3 border-t border-emerald-500/30">
                                    <p className="text-xs text-emerald-300/70 font-mono whitespace-pre-wrap">
                                      {metadata.dataPreview}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Computation Details */}
                            {metadata && (metadata.circuitInput || metadata.params || metadata.commitment) && (
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-400 font-medium mb-2">Computation Details</p>
                                <div className="space-y-2 text-sm">
                                  {metadata.circuitInput && (
                                    <div>
                                      <span className="text-gray-500">Input Data: </span>
                                      <span className="text-gray-300 font-mono">
                                        [{Array.isArray(metadata.circuitInput) ? metadata.circuitInput.join(', ') : metadata.circuitInput}]
                                      </span>
                                    </div>
                                  )}
                                  {metadata.params && Object.keys(metadata.params).length > 0 && (
                                    <div>
                                      <span className="text-gray-500">Parameters: </span>
                                      <span className="text-gray-300">{JSON.stringify(metadata.params)}</span>
                                    </div>
                                  )}
                                  {metadata.commitment && (
                                    <div>
                                      <span className="text-gray-500">Commitment: </span>
                                      <span className="text-gray-300 font-mono text-xs break-all">
                                        {metadata.commitment}
                                      </span>
                                    </div>
                                  )}
                                  {metadata.dataSource && (
                                    <div>
                                      <span className="text-gray-500">Data Source: </span>
                                      <span className={`font-medium ${metadata.dataSource === 'real' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                        {metadata.dataSource === 'real' ? '✓ Real Data' : '⚠ Mock Data'}
                                      </span>
                                    </div>
                                  )}
                                  {metadata.computedAt && (
                                    <div>
                                      <span className="text-gray-500">Computed At: </span>
                                      <span className="text-gray-300">
                                        {new Date(metadata.computedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {metadata && metadata.memo && metadata.memo.length > 0 && (
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-400 font-medium mb-1">Notes</p>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{metadata.memo}</p>
                              </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">Data Records</p>
                                <p className="text-lg font-bold text-white">{result.dataRecordIds.length}</p>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">Proof Size</p>
                                <p className="text-lg font-bold text-white">{result.proof.length} bytes</p>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">Circuit Type</p>
                                <p className="text-sm font-semibold text-white capitalize">{result.circuitName}</p>
                              </div>
                              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-400 font-medium mb-1">Transaction</p>
                                <a
                                  href={`https://testnet.suivision.xyz/txblock/${result.txDigest}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-mono text-emerald-400 hover:text-emerald-300 truncate block"
                                >
                                  {result.txDigest.substring(0, 8)}...
                                </a>
                              </div>
                            </div>

                            {/* Expand/Collapse Button */}
                            <button
                              onClick={() => toggleExpand(result.resultId)}
                              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Hide Details</span>
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </>
                              ) : (
                                <>
                                  <span>Show Details</span>
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </>
                              )}
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="mt-4 space-y-4">
                                {/* Data Record IDs */}
                                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                  <h4 className="text-sm font-bold text-emerald-400 mb-2">Data Records Used</h4>
                                  <div className="space-y-1">
                                    {result.dataRecordIds.map((id, idx) => (
                                      <p key={idx} className="text-xs font-mono text-gray-400 truncate">
                                        {id}
                                      </p>
                                    ))}
                                  </div>
                                </div>

                                {/* Public Inputs */}
                                {result.publicInputs && (
                                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-emerald-400 mb-2">Public Inputs</h4>
                                    <p className="text-xs font-mono text-gray-300 break-all">
                                      {result.publicInputs}
                                    </p>
                                  </div>
                                )}

                                {/* Metadata */}
                                {metadata && (
                                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-emerald-400 mb-2">Metadata</h4>
                                    <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
                                      {JSON.stringify(metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {/* Verification Details */}
                                {result.verified && (
                                  <div className="bg-emerald-900/20 border border-emerald-500 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <h4 className="text-sm font-bold text-emerald-400">Verification Confirmed</h4>
                                    </div>
                                    <p className="text-xs text-emerald-300">
                                      Verified at {formatDate(result.verifiedAt)}
                                    </p>
                                  </div>
                                )}
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
                      {loading ? 'Refreshing...' : 'Refresh Results'}
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
