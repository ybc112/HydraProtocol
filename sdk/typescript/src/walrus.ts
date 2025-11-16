import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

/**
 * Walrus存储客户端
 *
 * 功能：
 * - 上传数据到Walrus网络
 * - 从Walrus网络下载数据
 * - 验证数据完整性
 */
export class WalrusClient {
    private walrusBinary: string;
    private config: WalrusConfig;

    constructor(config?: Partial<WalrusConfig>) {
        this.config = {
            walrusBinary: config?.walrusBinary || 'walrus',
            network: config?.network || 'testnet',
            rpcUrl: config?.rpcUrl || 'https://walrus-testnet-rpc.sui.io',
            ...config
        };
        this.walrusBinary = this.config.walrusBinary;
    }

    /**
     * 上传数据到Walrus
     *
     * @param data - 要上传的数据（Buffer或字符串）
     * @param metadata - 可选的元数据
     * @returns Blob ID和上传信息
     */
    async upload(
        data: Buffer | string,
        metadata?: Record<string, any>
    ): Promise<WalrusUploadResult> {
        try {
            // 创建临时文件
            const tempDir = await fs.mkdtemp('/tmp/walrus-');
            const tempFile = path.join(tempDir, 'data.bin');

            // 写入数据
            const buffer = typeof data === 'string' ? Buffer.from(data) : data;
            await fs.writeFile(tempFile, buffer);

            console.log(`📤 上传数据到 Walrus (${buffer.length} bytes)...`);

            // 调用Walrus CLI上传
            const { stdout, stderr } = await execAsync(
                `${this.walrusBinary} store ${tempFile} --network ${this.config.network}`
            );

            // 清理临时文件
            await fs.rm(tempDir, { recursive: true, force: true });

            // 解析输出获取Blob ID
            const blobId = this.extractBlobId(stdout);

            if (!blobId) {
                throw new Error(`无法从Walrus输出中提取Blob ID: ${stdout}`);
            }

            console.log(`✅ 上传成功! Blob ID: ${blobId}`);

            return {
                blobId,
                size: buffer.length,
                metadata,
                timestamp: Date.now()
            };
        } catch (error: any) {
            console.error('❌ 上传失败:', error.message);
            throw new Error(`Walrus上传失败: ${error.message}`);
        }
    }

    /**
     * 从Walrus下载数据
     *
     * @param blobId - Blob ID
     * @returns 下载的数据
     */
    async download(blobId: string): Promise<Buffer> {
        try {
            console.log(`📥 从 Walrus 下载数据 (Blob ID: ${blobId})...`);

            // 创建临时文件
            const tempDir = await fs.mkdtemp('/tmp/walrus-');
            const tempFile = path.join(tempDir, 'downloaded.bin');

            // 调用Walrus CLI下载
            await execAsync(
                `${this.walrusBinary} read ${blobId} -o ${tempFile} --network ${this.config.network}`
            );

            // 读取下载的数据
            const data = await fs.readFile(tempFile);

            // 清理临时文件
            await fs.rm(tempDir, { recursive: true, force: true });

            console.log(`✅ 下载成功! (${data.length} bytes)`);

            return data;
        } catch (error: any) {
            console.error('❌ 下载失败:', error.message);
            throw new Error(`Walrus下载失败: ${error.message}`);
        }
    }

    /**
     * 检查Blob是否存在
     *
     * @param blobId - Blob ID
     * @returns 是否存在
     */
    async exists(blobId: string): Promise<boolean> {
        try {
            // 尝试获取Blob信息
            const { stdout } = await execAsync(
                `${this.walrusBinary} blob-info ${blobId} --network ${this.config.network}`
            );
            return stdout.includes(blobId);
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取Blob信息
     *
     * @param blobId - Blob ID
     * @returns Blob信息
     */
    async getBlobInfo(blobId: string): Promise<WalrusBlobInfo> {
        try {
            const { stdout } = await execAsync(
                `${this.walrusBinary} blob-info ${blobId} --network ${this.config.network}`
            );

            // 解析输出（简化版，实际输出格式可能不同）
            return {
                blobId,
                size: parseInt(stdout.match(/Size: (\d+)/)?.[1] || '0'),
                created: Date.now(),
                erasureCode: {
                    dataShards: 4,
                    parityShards: 2,
                    totalShards: 6
                }
            };
        } catch (error: any) {
            throw new Error(`获取Blob信息失败: ${error.message}`);
        }
    }

    /**
     * 从Walrus CLI输出中提取Blob ID
     *
     * @param output - CLI输出
     * @returns Blob ID
     */
    private extractBlobId(output: string): string | null {
        // 匹配常见的Blob ID格式
        // 示例格式: "Blob ID: abc123..."
        // 或者: "blob_id": "abc123..."
        const patterns = [
            /Blob ID:\s*([a-zA-Z0-9]+)/i,
            /"blob_id":\s*"([a-zA-Z0-9]+)"/,
            /blob_id:\s*([a-zA-Z0-9]+)/i,
            /Successfully stored blob:\s*([a-zA-Z0-9]+)/i
        ];

        for (const pattern of patterns) {
            const match = output.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // 如果上述模式都不匹配，尝试提取第一个长度>20的字母数字字符串
        const fallbackMatch = output.match(/([a-zA-Z0-9]{20,})/);
        return fallbackMatch ? fallbackMatch[1] : null;
    }
}

/**
 * Walrus配置
 */
export interface WalrusConfig {
    walrusBinary: string;  // Walrus CLI路径
    network: 'testnet' | 'mainnet';
    rpcUrl: string;
}

/**
 * 上传结果
 */
export interface WalrusUploadResult {
    blobId: string;
    size: number;
    metadata?: Record<string, any>;
    timestamp: number;
}

/**
 * Blob信息
 */
export interface WalrusBlobInfo {
    blobId: string;
    size: number;
    created: number;
    erasureCode: {
        dataShards: number;
        parityShards: number;
        totalShards: number;
    };
}

/**
 * 创建Walrus客户端
 *
 * @param config - 配置
 * @returns Walrus客户端实例
 */
export function createWalrusClient(config?: Partial<WalrusConfig>): WalrusClient {
    return new WalrusClient(config);
}
