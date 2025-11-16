'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton, useWallet } from '@suiet/wallet-kit';

export function Header() {
  const wallet = useWallet();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                HydraProtocol
              </h1>
              <p className="text-xs text-gray-400">Privacy-Preserving Data Marketplace</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/dashboard')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/marketplace"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/marketplace')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              Marketplace
            </Link>
            <Link
              href="/compute"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/compute')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              Compute
            </Link>
            <Link
              href="/my-data"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/my-data')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              My Data
            </Link>
            <Link
              href="/results"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/results')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              Results
            </Link>
            <Link
              href="/docs"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/docs')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              Docs
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            <ConnectButton className="!bg-emerald-500 hover:!bg-emerald-600 !transition-all" />
            {wallet.connected && (
              <div className="hidden lg:flex items-center space-x-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-emerald-400 font-medium">Connected</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center justify-around mt-4 pt-4 border-t border-slate-800">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
              isActive('/') ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs font-medium">Home</span>
          </Link>
          <Link
            href="/marketplace"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
              isActive('/marketplace') ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-xs font-medium">Market</span>
          </Link>
          <Link
            href="/compute"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
              isActive('/compute') ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Compute</span>
          </Link>
          <Link
            href="/my-data"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
              isActive('/my-data') ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <span className="text-xs font-medium">My Data</span>
          </Link>
          <Link
            href="/results"
            className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
              isActive('/results') ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-medium">Results</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
