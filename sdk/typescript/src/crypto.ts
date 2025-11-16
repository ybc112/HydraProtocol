import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import { x25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * 加密工具类
 *
 * 功能：
 * - AES-256-GCM 加密/解密
 * - SHA256 哈希计算
 * - 随机数生成
 */
export class CryptoUtils {
    /**
     * 加密数据
     *
     * @param data - 明文数据
     * @param key - 加密密钥（32字节）
     * @returns 加密结果（包含IV和密文）
     */
    static encrypt(data: Buffer, key?: Buffer): EncryptedData {
        // 如果未提供密钥，生成随机密钥
        const encryptionKey = key || randomBytes(32);

        // 生成随机IV
        const iv = randomBytes(16);

        // 创建加密器（AES-256-GCM）
        const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

        // 加密数据
        const encrypted = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);

        // 获取认证标签
        const authTag = cipher.getAuthTag();

        return {
            ciphertext: encrypted,
            iv,
            authTag,
            key: encryptionKey
        };
    }

    /**
     * 解密数据
     *
     * @param encrypted - 加密数据
     * @param key - 解密密钥
     * @returns 明文数据
     */
    static decrypt(encrypted: EncryptedData, key: Buffer): Buffer {
        // 创建解密器
        const decipher = createDecipheriv('aes-256-gcm', key, encrypted.iv);

        // 设置认证标签
        decipher.setAuthTag(encrypted.authTag);

        // 解密数据
        const decrypted = Buffer.concat([
            decipher.update(encrypted.ciphertext),
            decipher.final()
        ]);

        return decrypted;
    }

    /**
     * 计算SHA256哈希
     *
     * @param data - 输入数据
     * @returns 哈希值（32字节）
     */
    static sha256(data: Buffer): Buffer {
        return Buffer.from(sha256(data));
    }

    /**
     * 计算SHA256哈希（返回十六进制字符串）
     *
     * @param data - 输入数据
     * @returns 哈希值（十六进制）
     */
    static sha256Hex(data: Buffer): string {
        return bytesToHex(sha256(data));
    }

    /**
     * 生成随机字节
     *
     * @param length - 字节数
     * @returns 随机字节
     */
    static randomBytes(length: number): Buffer {
        return randomBytes(length);
    }

    /**
     * 生成随机掩码（用于ZKP）
     *
     * @param count - 掩码数量
     * @returns 掩码数组
     */
    static generateMasks(count: number): bigint[] {
        const masks: bigint[] = [];
        for (let i = 0; i < count; i++) {
            // 生成32位随机数
            const randomValue = randomBytes(4).readUInt32BE(0);
            masks.push(BigInt(randomValue));
        }
        return masks;
    }

    /**
     * 将Buffer转换为Uint8Array
     *
     * @param buffer - Buffer
     * @returns Uint8Array
     */
    static bufferToUint8Array(buffer: Buffer): Uint8Array {
        return new Uint8Array(buffer);
    }

    /**
     * 将Uint8Array转换为Buffer
     *
     * @param uint8Array - Uint8Array
     * @returns Buffer
     */
    static uint8ArrayToBuffer(uint8Array: Uint8Array): Buffer {
        return Buffer.from(uint8Array);
    }

    /**
     * 编码数据为可上传格式
     *
     * @param data - 原始数据
     * @returns 编码后的数据
     */
    static encodeForStorage(data: any): Buffer {
        // 将JSON对象转换为Buffer
        const jsonString = JSON.stringify(data);
        return Buffer.from(jsonString, 'utf-8');
    }

    /**
     * 解码存储的数据
     *
     * @param buffer - 编码的数据
     * @returns 原始数据
     */
    static decodeFromStorage(buffer: Buffer): any {
        const jsonString = buffer.toString('utf-8');
        return JSON.parse(jsonString);
    }
}

/**
 * 加密数据结构
 */
export interface EncryptedData {
    ciphertext: Buffer;  // 密文
    iv: Buffer;          // 初始化向量
    authTag: Buffer;     // 认证标签
    key: Buffer;         // 加密密钥
}

/**
 * 创建加密的数据包
 *
 * @param data - 原始数据
 * @param encryptionKey - 可选的加密密钥
 * @returns 加密的数据包
 */
export function createEncryptedPackage(
    data: Record<string, any>,
    encryptionKey?: Buffer
): EncryptedPackage {
    // 编码数据
    const encodedData = CryptoUtils.encodeForStorage(data);

    // 加密
    const encrypted = CryptoUtils.encrypt(encodedData, encryptionKey);

    // 计算哈希
    const hash = CryptoUtils.sha256(encodedData);

    return {
        encrypted,
        hash,
        metadata: {
            algorithm: 'aes-256-gcm',
            timestamp: Date.now(),
            size: encodedData.length
        }
    };
}

/**
 * 使用X25519密钥协商，将对称密钥安全地加密给买家
 * 加密格式：ownerPub(32) || iv(12) || ciphertext+authTag
 */
export function encryptSymmetricKeyForBuyer(
  symmetricKey: Uint8Array,
  buyerPublicX25519: Uint8Array,
  ownerPrivateX25519?: Uint8Array
): Uint8Array {
  const priv = ownerPrivateX25519 || x25519.utils.randomPrivateKey();
  const ownerPub = x25519.getPublicKey(priv);
  const shared = x25519.getSharedSecret(priv, buyerPublicX25519);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(shared), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(symmetricKey)),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([Buffer.from(ownerPub), iv, encrypted, tag]);
  return new Uint8Array(payload);
}

/**
 * 解密数据包
 *
 * @param package - 加密的数据包
 * @param key - 解密密钥
 * @returns 原始数据
 */
export function decryptPackage(
    pkg: EncryptedPackage,
    key: Buffer
): Record<string, any> {
    // 解密
    const decrypted = CryptoUtils.decrypt(pkg.encrypted, key);

    // 验证哈希
    const calculatedHash = CryptoUtils.sha256(decrypted);
    if (!calculatedHash.equals(pkg.hash)) {
        throw new Error('数据完整性验证失败');
    }

    // 解码
    return CryptoUtils.decodeFromStorage(decrypted);
}

/**
 * 加密的数据包
 */
export interface EncryptedPackage {
    encrypted: EncryptedData;
    hash: Buffer;
    metadata: {
        algorithm: string;
        timestamp: number;
        size: number;
    };
}
