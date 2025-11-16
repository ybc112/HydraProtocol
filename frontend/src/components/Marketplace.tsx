'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@suiet/wallet-kit';
import { useMarketplaceData } from '../hooks/useMarketplaceData';
import { usePurchaseData } from '../hooks/usePurchaseData';
import { usePurchasedStatus } from '../hooks/usePurchasedStatus';
import { UploadData } from './UploadData';

export function Marketplace() {
  const wallet = useWallet();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc' | 'rating'>('latest');
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch marketplace data from blockchain
  const { datasets, loading, error, refetch } = useMarketplaceData();

  // Purchase functionality
  const { purchase, isPurchasing, error: purchaseError } = usePurchaseData();

  const categories = ['All', 'Healthcare', 'Finance', 'Research', 'IoT', 'Logistics'];

  // Filter datasets by category and search query
  const filteredDatasets = datasets
    .filter(d => {
      const matchCategory = selectedCategory === 'All' || d.category === selectedCategory;
      const matchSearch = searchQuery === '' ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.priceInSui - b.priceInSui;
        case 'price_desc':
          return b.priceInSui - a.priceInSui;
        case 'rating':
          return (b.stats?.rating || 0) - (a.stats?.rating || 0);
        case 'latest':
        default:
          return 0; // Keep original order (latest from blockchain)
      }
    });

  const { purchasedMap } = usePurchasedStatus(filteredDatasets.map(d => d.id));

  // Handle purchase button click
  const handlePurchase = async (datasetId: string, priceInSui: number) => {
    if (purchasedMap[datasetId]) {
      setSuccessMessage(null);
      return;
    }
    setPurchasingId(datasetId);
    setSuccessMessage(null);

    const result = await purchase(datasetId, priceInSui);

    if (result.success) {
      setSuccessMessage(`Successfully purchased! Transaction: ${result.transactionDigest?.slice(0, 10)}...`);
      // Refresh the marketplace data
      await refetch();
    } else {
      console.error('Purchase failed:', result.error);
    }

    setPurchasingId(null);
  };

  return (
    <section className="py-12 px-6 bg-slate-900 min-h-screen">
      <div className="container mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-white">
            Data Marketplace
          </h1>
          <p className="text-xl text-gray-400">
            Browse and purchase privacy-preserving datasets
          </p>
        </div>

        {/* Upload Data Section */}
        <div className="mb-12">
          <UploadData />
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-emerald-300 font-medium">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error Message */}
        {(error || purchaseError) && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-300 font-medium">{error || purchaseError}</span>
          </div>
        )}

        {/* Search and Sort Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search datasets by title, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none w-full md:w-48 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="latest">Latest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-4 text-gray-400">
            Found <span className="text-emerald-400 font-semibold">{filteredDatasets.length}</span> result{filteredDatasets.length !== 1 ? 's' : ''} for "<span className="text-white">{searchQuery}</span>"
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Dataset Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mb-4"></div>
            <p className="text-lg text-gray-300">Loading marketplace data...</p>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-24 w-24 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xl text-gray-400 mb-2">No datasets found in this category</p>
            <p className="text-gray-500">Try selecting a different category or upload your own data</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDatasets.map((dataset) => (
              <div
                key={dataset.id}
                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all group"
              >
                {/* Card Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white line-clamp-1">{dataset.title}</h3>
                        {dataset.verified && (
                          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="inline-block px-3 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                        {dataset.category}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-2xl font-bold text-emerald-400">
                        {dataset.price}
                      </div>
                      <div className="text-xs text-gray-500">per query</div>
                    </div>
                  </div>

                  {/* Description or Image File Info */}
                  {dataset.fileType?.startsWith('image/') && dataset.fileName ? (
                    /* For images, show filename and type instead of path */
                    <div className="mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-emerald-400 font-medium truncate">{dataset.fileName}</span>
                      <span className="text-xs text-gray-500 px-2 py-1 bg-slate-700 rounded flex-shrink-0">
                        {dataset.fileType}
                      </span>
                    </div>
                  ) : (
                    /* For other files, show description */
                    <p className="text-gray-400 mb-4 leading-relaxed line-clamp-2">{dataset.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{dataset.stats.records}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{dataset.stats.queries}</span>
                    </div>
                    {/* Rating or New Badge */}
                    {dataset.stats.rating > 0 ? (
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{dataset.stats.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded border border-emerald-500/30">
                        NEW
                      </div>
                    )}
                  </div>

                  {/* Provider */}
                  <div className="text-xs text-gray-500 mb-4 truncate">
                    Provider: <span className="font-mono">{dataset.provider.substring(0, 10)}...{dataset.provider.substring(dataset.provider.length - 8)}</span>
                  </div>

                  {/* Purchase Button */}
                  {wallet.connected && wallet.account && dataset.provider === wallet.account.address ? (
                    <div className="w-full px-4 py-3 rounded-lg font-semibold bg-slate-700 text-gray-400 border border-slate-600 text-center">
                      Your Data
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => handlePurchase(dataset.id, dataset.priceInSui)}
                        disabled={!wallet.connected || purchasingId === dataset.id || purchasedMap[dataset.id]}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                          wallet.connected && purchasingId !== dataset.id && !purchasedMap[dataset.id]
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105'
                            : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {!wallet.connected
                          ? 'Connect Wallet'
                          : purchasedMap[dataset.id]
                          ? 'Already Purchased'
                          : purchasingId === dataset.id
                          ? 'Processing...'
                          : 'Purchase Access'}
                      </button>
                      {purchasedMap[dataset.id] && (
                        <a href="/compute" className="mt-2 inline-block text-emerald-400 hover:text-emerald-300 text-sm">Go to Compute →</a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View My Purchases Link */}
        {wallet.connected && datasets.length > 0 && (
          <div className="text-center mt-12">
            <Link
              href="/my-data"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-emerald-500 text-emerald-400 font-semibold rounded-lg hover:bg-emerald-500/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              View My Purchased Data
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
