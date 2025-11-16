import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

/**
 * Hydra智能合约客户端
 *
 * 功能：
 * - 注册数据到DataRegistry
 * - 注册ZKP电路
 * - 提交和验证证明
 * - 数据市场交易
 */
export class HydraContract {
    private client: SuiClient;
    private packageId: string;
    private dataRegistryId: string;
    private marketplaceId: string;
    private zkpRegistryId: string;

    constructor(config: ContractConfig) {
        this.client = new SuiClient({
            url: config.rpcUrl || getFullnodeUrl(config.network || 'testnet')
        });

        this.packageId = config.packageId;
        this.dataRegistryId = config.dataRegistryId;
        this.marketplaceId = config.marketplaceId;
        this.zkpRegistryId = config.zkpRegistryId;
    }

    /**
     * 注册数据
     *
     * @param params - 注册参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async registerData(
        params: RegisterDataParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::data_registry::register_data`,
            arguments: [
                tx.object(this.dataRegistryId),
                tx.pure(params.blobId),
                tx.pure(Array.from(params.dataHash)),
                tx.pure(params.dataSize),
                tx.pure(params.dataType),
                tx.pure(params.metadata),
                tx.pure(params.encrypted),
                tx.pure(params.isPublic),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true
            }
        });

        return result.digest;
    }

    /**
     * 授权访问
     *
     * @param params - 授权参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async grantAccess(
        params: GrantAccessParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::data_registry::grant_access`,
            arguments: [
                tx.object(params.dataRecordId),
                tx.pure(params.grantee),
                tx.pure(params.permissionType),
                tx.pure(params.expiresAt),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx
        });

        return result.digest;
    }

    async registerEncryptionPubkey(pubkey: Uint8Array, keypair: Ed25519Keypair): Promise<string> {
        const tx = new TransactionBlock();
        tx.moveCall({
            target: `${this.packageId}::data_registry::register_user_pubkey`,
            arguments: [
                tx.object(this.dataRegistryId),
                tx.pure(Array.from(pubkey)),
            ]
        });
        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx
        });
        return result.digest;
    }

    async setEncryptedKeyForBuyer(
        params: SetEncryptedKeyParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::market::distribute_key_to_buyer`,
            arguments: [
                tx.object(params.listingId),
                tx.object(params.dataRecordId),
                tx.pure(params.buyer),
                tx.pure(Array.from(params.encryptedKey)),
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx
        });

        return result.digest;
    }

    /**
     * 注册ZKP电路
     *
     * @param params - 注册参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async registerCircuit(
        params: RegisterCircuitParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::zkp_verifier::register_circuit`,
            arguments: [
                tx.object(this.zkpRegistryId),
                tx.pure(params.circuitName),
                tx.pure(params.curveType),
                tx.pure(Array.from(params.verificationKey)),
                tx.pure(params.description),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true
            }
        });

        return result.digest;
    }

    /**
     * 提交证明
     *
     * @param params - 证明参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async submitProof(
        params: SubmitProofParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::zkp_verifier::submit_proof`,
            arguments: [
                tx.pure(Array.from(params.proof)),
                tx.pure(Array.from(params.publicInputs)),
                tx.pure(params.circuitName),
                tx.pure(params.dataRecordIds.map(id => id)),
                tx.pure(params.metadata),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true
            }
        });

        return result.digest;
    }

    /**
     * 验证证明
     *
     * @param params - 验证参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async verifyProof(
        params: VerifyProofParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::zkp_verifier::verify_proof`,
            arguments: [
                tx.object(this.zkpRegistryId),
                tx.object(params.computationResultId),
                tx.object(params.verificationKeyId),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx
        });

        return result.digest;
    }

    /**
     * 挂牌数据
     *
     * @param params - 挂牌参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async listData(
        params: ListDataParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        tx.moveCall({
            target: `${this.packageId}::market::list_data`,
            arguments: [
                tx.object(this.marketplaceId),
                tx.object(params.dataRecordId),
                tx.pure(params.price),
                tx.pure(params.category),
                tx.pure(params.description),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx,
            options: {
                showEffects: true,
                showObjectChanges: true
            }
        });

        return result.digest;
    }

    /**
     * 购买数据访问权
     *
     * @param params - 购买参数
     * @param keypair - 签名密钥对
     * @returns 交易结果
     */
    async purchaseDataAccess(
        params: PurchaseDataParams,
        keypair: Ed25519Keypair
    ): Promise<string> {
        const tx = new TransactionBlock();

        // 创建支付代币
        const [coin] = tx.splitCoins(tx.gas, [tx.pure(params.paymentAmount)]);

        tx.moveCall({
            target: `${this.packageId}::market::purchase_data_access`,
            arguments: [
                tx.object(this.marketplaceId),
                tx.object(params.listingId),
                tx.object(params.dataRecordId),
                coin,
                tx.pure(params.accessDuration),
                tx.object('0x6')  // Clock object
            ]
        });

        const result = await this.client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: tx
        });

        return result.digest;
    }

    /**
     * 查询数据记录
     *
     * @param objectId - 对象ID
     * @returns 数据记录信息
     */
    async getDataRecord(objectId: string): Promise<DataRecord | null> {
        try {
            const object = await this.client.getObject({
                id: objectId,
                options: { showContent: true }
            });

            if (object.data && object.data.content && object.data.content.dataType === 'moveObject') {
                const fields = object.data.content.fields as any;
                return {
                    id: objectId,
                    owner: fields.owner,
                    blobId: fields.blob_id,
                    dataHash: fields.data_hash,
                    dataSize: parseInt(fields.data_size),
                    dataType: fields.data_type,
                    encrypted: fields.encrypted,
                    isPublic: fields.is_public
                };
            }

            return null;
        } catch (error) {
            console.error('获取数据记录失败:', error);
            return null;
        }
    }
}

/**
 * 合约配置
 */
export interface ContractConfig {
    network?: 'testnet' | 'mainnet';
    rpcUrl?: string;
    packageId: string;
    dataRegistryId: string;
    marketplaceId: string;
    zkpRegistryId: string;
}

/**
 * 注册数据参数
 */
export interface RegisterDataParams {
    blobId: string;
    dataHash: Uint8Array;
    dataSize: number;
    dataType: string;
    metadata: string;
    encrypted: boolean;
    isPublic: boolean;
}

/**
 * 授权访问参数
 */
export interface GrantAccessParams {
    dataRecordId: string;
    grantee: string;
    permissionType: string;
    expiresAt: number;
}

export interface SetEncryptedKeyParams {
    dataRecordId: string;
    listingId: string;
    buyer: string;
    encryptedKey: Uint8Array;
}

/**
 * 注册电路参数
 */
export interface RegisterCircuitParams {
    circuitName: string;
    curveType: number;
    verificationKey: Uint8Array;
    description: string;
}

/**
 * 提交证明参数
 */
export interface SubmitProofParams {
    proof: Uint8Array;
    publicInputs: Uint8Array;
    circuitName: string;
    dataRecordIds: string[];
    metadata: string;
}

/**
 * 验证证明参数
 */
export interface VerifyProofParams {
    computationResultId: string;
    verificationKeyId: string;
}

/**
 * 挂牌数据参数
 */
export interface ListDataParams {
    dataRecordId: string;
    price: number;
    category: string;
    description: string;
}

/**
 * 购买数据参数
 */
export interface PurchaseDataParams {
    listingId: string;
    dataRecordId: string;
    paymentAmount: number;
    accessDuration: number;
}

/**
 * 数据记录
 */
export interface DataRecord {
    id: string;
    owner: string;
    blobId: string;
    dataHash: number[];
    dataSize: number;
    dataType: string;
    encrypted: boolean;
    isPublic: boolean;
}

/**
 * 电路信息
 */
export interface CircuitInfo {
    id: string;
    name: string;
    owner: string;
    curveType: number;
    active: boolean;
}

/**
 * 挂牌信息
 */
export interface ListingInfo {
    id: string;
    owner: string;
    dataRecordId: string;
    price: number;
    active: boolean;
}

/**
 * 创建合约客户端
 *
 * @param config - 配置
 * @returns 合约客户端实例
 */
export function createHydraContract(config: ContractConfig): HydraContract {
    return new HydraContract(config);
}
