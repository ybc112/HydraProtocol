/**
 * HydraProtocol SDK Configuration for Frontend
 */

/**
 * Hydra Protocol Configuration Type
 */
export interface HydraConfig {
  walrus?: {
    binary?: string;
    network?: 'testnet' | 'mainnet';
    rpcUrl?: string;
  };
  sui?: {
    network?: 'testnet' | 'mainnet';
    packageId?: string;
    dataRegistryId?: string;
    marketplaceId?: string;
    zkpRegistryId?: string;
  };
  circuits?: {
    dir?: string;
  };
}

/**
 * Get Hydra SDK configuration from environment variables
 */
export const getHydraConfig = (): HydraConfig => {
  return {
    walrus: {
      binary: 'walrus',
      network: (process.env.NEXT_PUBLIC_WALRUS_NETWORK as 'testnet' | 'mainnet') || 'testnet',
      rpcUrl: process.env.NEXT_PUBLIC_WALRUS_RPC_URL || 'https://walrus-testnet-rpc.sui.io'
    },
    sui: {
      network: (process.env.NEXT_PUBLIC_SUI_NETWORK as 'testnet' | 'mainnet') || 'testnet',
      packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || '',
      dataRegistryId: process.env.NEXT_PUBLIC_DATA_REGISTRY_ID || '',
      marketplaceId: process.env.NEXT_PUBLIC_MARKETPLACE_ID || '',
      zkpRegistryId: process.env.NEXT_PUBLIC_ZKP_REGISTRY_ID || ''
    },
    circuits: {
      dir: '../circuits/build'
    }
  };
};

/**
 * Validate that all required environment variables are set
 */
export const validateConfig = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_PACKAGE_ID',
    'NEXT_PUBLIC_DATA_REGISTRY_ID',
    'NEXT_PUBLIC_MARKETPLACE_ID',
    'NEXT_PUBLIC_ZKP_REGISTRY_ID'
  ];

  const missing = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Contract addresses (for reference and debugging)
 */
export const CONTRACT_ADDRESSES = {
  packageId: process.env.NEXT_PUBLIC_PACKAGE_ID,
  dataRegistryId: process.env.NEXT_PUBLIC_DATA_REGISTRY_ID,
  marketplaceId: process.env.NEXT_PUBLIC_MARKETPLACE_ID,
  zkpRegistryId: process.env.NEXT_PUBLIC_ZKP_REGISTRY_ID
} as const;
