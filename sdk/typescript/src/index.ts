/**
 * HydraProtocol TypeScript SDK
 *
 * 功能：
 * - Walrus存储集成
 * - ZKP证明生成和验证
 * - Sui合约交互
 * - 数据加密和解密
 *
 * @packageDocumentation
 */

// Walrus模块
export {
    WalrusClient,
    createWalrusClient,
    WalrusConfig,
    WalrusUploadResult,
    WalrusBlobInfo
} from './walrus';

// 加密模块
export {
    CryptoUtils,
    createEncryptedPackage,
    decryptPackage,
    EncryptedData,
    EncryptedPackage
} from './crypto';

// ZKP模块
export {
    ZKProver,
    createAverageProver,
    createThresholdProver,
    generateAverageProof,
    generateThresholdProof,
    FormattedProof,
    ProofResult
} from './zkp';

// Sui合约模块
export {
    HydraContract,
    createHydraContract,
    DataRecord,
    CircuitInfo,
    ListingInfo
} from './contract';

/**
 * SDK版本
 */
export const VERSION = '1.0.0';

/**
 * SDK配置
 */
export interface HydraConfig {
    // Walrus配置
    walrus?: {
        binary?: string;
        network?: 'testnet' | 'mainnet';
        rpcUrl?: string;
    };

    // Sui配置
    sui?: {
        network?: 'testnet' | 'mainnet';
        packageId?: string;
        dataRegistryId?: string;
        marketplaceId?: string;
        zkpRegistryId?: string;
    };

    // Circuits配置
    circuits?: {
        dir?: string;
    };
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: HydraConfig = {
    walrus: {
        binary: 'walrus',
        network: 'testnet',
        rpcUrl: 'https://walrus-testnet-rpc.sui.io'
    },
    sui: {
        network: 'testnet',
        // 部署后填写
        packageId: '0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6',
        dataRegistryId: '0x0bb7375d29902c06253100f0ddc298d582fd41b7cd0e7b9e0271dd4a767c2707',
        marketplaceId: '0x29b8127932ba0467c3a2511a0ee95cecbd1dfc388622835880b6454c3ad02201',
        zkpRegistryId: '0x7e05c6cb6c0ffa398b8b21ae8ab87b985e17af03895ff48dcf7099be32d26e41'
    },
    circuits: {
        dir: '../circuits/build'
    }
};

/**
 * 初始化HydraProtocol SDK
 *
 * @param config - 配置选项
 * @returns SDK实例
 */
export function initializeHydra(config?: Partial<HydraConfig>) {
    const mergedConfig: HydraConfig = {
        ...DEFAULT_CONFIG,
        ...config
    };

    // 导入createWalrusClient函数
    const { createWalrusClient: createClient } = require('./walrus');

    return {
        config: mergedConfig,
        walrus: createClient(mergedConfig.walrus),
        version: VERSION
    };
}
