/**
 * Hook for fetching wallet SUI balance
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@suiet/wallet-kit';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig } from '../config/hydra';

export interface UseWalletBalanceReturn {
  balance: string;
  balanceInSui: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch user's SUI balance
 */
export function useWalletBalance(): UseWalletBalanceReturn {
  const wallet = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [balanceInSui, setBalanceInSui] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!wallet.connected || !wallet.account) {
      setBalance('0');
      setBalanceInSui(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const config = getHydraConfig();
      const client = new SuiClient({
        url: config.sui?.network === 'testnet'
          ? 'https://fullnode.testnet.sui.io:443'
          : 'https://fullnode.mainnet.sui.io:443'
      });

      // Get all coins owned by the address
      const coins = await client.getBalance({
        owner: wallet.account.address,
        coinType: '0x2::sui::SUI'
      });

      const totalBalance = coins.totalBalance;
      const balanceInSuiValue = Number(totalBalance) / 1_000_000_000;

      setBalance(totalBalance);
      setBalanceInSui(balanceInSuiValue);

      console.log('Wallet balance: ' + balanceInSuiValue + ' SUI');

    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance('0');
      setBalanceInSui(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [wallet.connected, wallet.account?.address]);

  return {
    balance,
    balanceInSui,
    loading,
    error,
    refetch: fetchBalance
  };
}
