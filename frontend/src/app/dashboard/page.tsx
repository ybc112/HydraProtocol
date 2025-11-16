'use client';

import { useState } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useUserStats } from '../../hooks/useUserStats';
import { useRecentActivity } from '../../hooks/useRecentActivity';

export default function DashboardPage() {
  const wallet = useWallet();
  const { balanceInSui, loading: loadingBalance } = useWalletBalance();
  const { stats, loading: loadingStats } = useUserStats();
  const [activityLimit, setActivityLimit] = useState(10);
  const { activities, loading: loadingActivity } = useRecentActivity(activityLimit);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityColor = (color: string) => {
    const colors: { [key: string]: string } = {
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      green: 'bg-green-500/10 text-green-400 border-green-500/30'
    };
    return colors[color] || colors.emerald;
  };

  return (
    <main className="min-h-screen bg-slate-900">
      <Header />

      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(16, 185, 129) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}></div>
      </div>

      <div className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <span className="text-emerald-400 font-semibold">📊 Dashboard</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
              Your Analytics
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl">
              Track your data marketplace activity, earnings, and ZKP computations.
            </p>
          </div>

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
                  Please connect your wallet to view your dashboard
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">Wallet Balance</h3>
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                  {loadingBalance ? (
                    <div className="animate-pulse h-8 bg-slate-700 rounded"></div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">
                        {balanceInSui.toFixed(2)} SUI
                      </div>
                      <div className="text-xs text-gray-500">
                        ~${(balanceInSui * 0.5).toFixed(2)} USD
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">Uploaded Data</h3>
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📤</span>
                    </div>
                  </div>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 bg-slate-700 rounded"></div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">
                        {stats.uploadedDataCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total datasets
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">Purchased Data</h3>
                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🛒</span>
                    </div>
                  </div>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 bg-slate-700 rounded"></div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">
                        {stats.purchasedDataCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total purchases
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400">ZKP Computations</h3>
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🔐</span>
                    </div>
                  </div>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 bg-slate-700 rounded"></div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-white mb-1">
                        {stats.zkpComputationCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        Proofs generated
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-emerald-300 mb-1">Total Revenue</h3>
                      <p className="text-xs text-emerald-400/60">From data sales</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  {loadingStats ? (
                    <div className="animate-pulse h-10 bg-emerald-500/10 rounded"></div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-emerald-400 mb-1">
                        {stats.totalRevenue.toFixed(2)} SUI
                      </div>
                      <div className="text-xs text-emerald-400/60">
                        ~${(stats.totalRevenue * 0.5).toFixed(2)} USD
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-purple-300 mb-1">Total Spent</h3>
                      <p className="text-xs text-purple-400/60">On data purchases</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                  {loadingStats ? (
                    <div className="animate-pulse h-10 bg-purple-500/10 rounded"></div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-purple-400 mb-1">
                        {stats.totalSpent.toFixed(2)} SUI
                      </div>
                      <div className="text-xs text-purple-400/60">
                        ~${(stats.totalSpent * 0.5).toFixed(2)} USD
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span>📈</span>
                    Recent Activity
                  </h2>
                  {!loadingActivity && activities.length > 0 && (
                    <span className="text-sm text-gray-400">
                      Last {activities.length} activities
                    </span>
                  )}
                </div>

                {loadingActivity ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-slate-700 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-slate-700 rounded w-1/3 mb-2"></div>
                            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 mb-4">No activity yet</p>
                    <a href="/marketplace" className="text-emerald-400 hover:text-emerald-300">
                      Start by browsing the marketplace →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="relative">
                        {index < activities.length - 1 && (
                          <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-slate-700"></div>
                        )}

                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.color)}`}>
                            <span className="text-lg">{activity.icon}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-white mb-1">{activity.title}</h4>
                                <p className="text-sm text-gray-400 mb-2">{activity.description}</p>
                                <a
                                  href={`https://testnet.suivision.xyz/txblock/${activity.txDigest}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                                >
                                  {activity.txDigest.substring(0, 16)}...
                                </a>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {formatTimestamp(activity.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Load More Button */}
                    {activities.length >= activityLimit && activities.length > 0 && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setActivityLimit(prev => prev + 10)}
                          disabled={loadingActivity}
                          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingActivity ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </span>
                          ) : (
                            `Load More Activities`
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          Showing {activities.length} activities
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a
                  href="/upload"
                  className="group bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Upload Data</h3>
                  <p className="text-sm text-gray-400">Share your data and earn SUI tokens</p>
                </a>

                <a
                  href="/marketplace"
                  className="group bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-xl p-6 transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Browse Market</h3>
                  <p className="text-sm text-gray-400">Discover and purchase datasets</p>
                </a>

                <a
                  href="/compute"
                  className="group bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">ZKP Compute</h3>
                  <p className="text-sm text-gray-400">Perform private computations</p>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
