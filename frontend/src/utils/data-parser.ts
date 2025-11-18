/**
 * Data Parser Utilities
 * 真实数据下载、解密和解析工具
 */

'use client';

import * as XLSX from 'xlsx';
import { downloadFromWalrus } from './walrus';
import { SuiClient } from '@mysten/sui/client';
import { getHydraConfig, CONTRACT_ADDRESSES } from '../config/hydra';
import { x25519 } from '@noble/curves/ed25519';
import { readPrivateKey, readSymmetricKey, saveSymmetricKey } from './secure-store';

/**
 * 从多个来源获取加密密钥
 * 优先级：
 *   1. 传入的明文对称密钥 (Base64)
 *   2. 本地安全存储（IndexedDB 中加密存储的对称密钥）
 *   3. 旧版 localStorage（自动迁移到安全存储）
 *   4. 链上 KeyDistributed 事件（买家场景，通过买家私钥解包）
 */
async function getEncryptionKey(
  blobId: string,
  keyBase64?: string,
  opts?: { dataRecordId?: string; buyerAddress?: string }
): Promise<CryptoKey | null> {
  try {
    let keyB64 = keyBase64;
    // Prefer secure local symmetric key (uploader scenario)
    const localSym = await readSymmetricKey(blobId);
    if (localSym) {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        localSym,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      return cryptoKey;
    }

    // 1. 如果调用方显式传入了密钥（例如从外部安全通道获取），直接使用
    if (keyB64) {
      const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      return cryptoKey;
    }

    // 2. 优先从安全存储读取（自己上传的数据，对称密钥经过密码加密后存放在 IndexedDB）
    try {
      const symFromSecure = await readSymmetricKey(blobId);
      if (symFromSecure) {
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          symFromSecure,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
        return cryptoKey;
      }
    } catch (e) {
      console.warn('Failed to read symmetric key from secure store:', e);
    }

    // 3. 兼容旧版本：从 localStorage 读取明文 Base64，对称密钥，并尝试迁移到安全存储
    const legacyB64 = typeof window !== 'undefined'
      ? localStorage.getItem(`hydra:blobKey:${blobId}`) || undefined
      : undefined;
    if (legacyB64) {
      keyB64 = legacyB64;
      // 自动迁移到安全存储（最佳努力）
      try {
        const legacyBytes = Uint8Array.from(atob(legacyB64), c => c.charCodeAt(0));
        await saveSymmetricKey(blobId, legacyBytes);
        localStorage.removeItem(`hydra:blobKey:${blobId}`);
        console.log(`✅ Migrated symmetric key for blob ${blobId} to secure store`);
      } catch (e) {
        console.warn('Failed to migrate symmetric key to secure store:', e);
      }
    }

    if (!keyB64) {
      // 4. 尝试从链上事件检索加密的密钥并解包（买家场景）
      if (opts?.dataRecordId && opts?.buyerAddress) {
        const config = getHydraConfig();
        const client = new SuiClient({
          url: config.sui?.network === 'testnet'
            ? 'https://fullnode.testnet.sui.io:443'
            : 'https://fullnode.mainnet.sui.io:443'
        });

        const eventType = `${CONTRACT_ADDRESSES.packageId}::data_registry::KeyDistributed`;
        const events = await client.queryEvents({
          query: { MoveEventType: eventType },
          limit: 200,
          order: 'descending'
        });

        for (const ev of events.data) {
          const parsed = ev.parsedJson as any;
          if (parsed && parsed.data_id === opts.dataRecordId && parsed.buyer === opts.buyerAddress) {
            const payloadArr: number[] = parsed.encrypted_key || [];
            if (payloadArr.length > 0) {
              const payload = new Uint8Array(payloadArr);

              // 解析：前32字节为所有者X25519公钥，接着12字节IV，其后为密文+authTag
              if (payload.length < 32 + 12 + 16) {
                break;
              }
              const ownerPub = payload.slice(0, 32);
              const iv = payload.slice(32, 44);
              const cipher = payload.slice(44);

              const priv = await readPrivateKey(opts.buyerAddress!);
              if (!priv) { console.warn('Missing buyer private key for key decryption'); break; }
              const shared = x25519.getSharedSecret(priv, ownerPub);
              const sharedU8 = new Uint8Array(shared.length);
              for (let i = 0; i < shared.length; i++) sharedU8[i] = shared[i];

              // 使用共享密钥作为AES密钥，解密得到原始对称密钥
              const aesKey = await crypto.subtle.importKey('raw', sharedU8, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
              const decryptedSym = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipher);

              const symKeyBytes = new Uint8Array(decryptedSym);
              const symKey = await crypto.subtle.importKey(
                'raw',
                symKeyBytes,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
              );

              return symKey;
            }
          }
        }
      }

      console.warn(`⚠️ No encryption key found for blob: ${blobId}`);
      return null;
    }

    // 5. 如果此时仍然有 Base64 形式的对称密钥（来自旧版本或其他来源），导入为 AES-GCM 密钥
    if (keyB64) {
      const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      return cryptoKey;
    }

    return null;
  } catch (error) {
    console.error('❌ Failed to get encryption key:', error);
    return null;
  }
}

/**
 * 下载并解密Walrus存储的文件
 * @param blobId Walrus blob ID
 * @param encryptionKeyBase64 可选的Base64编码的加密密钥（用于购买的数据）
 */
export async function downloadAndDecrypt(
  blobId: string,
  encryptionKeyBase64?: string,
  opts?: { dataRecordId?: string; buyerAddress?: string }
): Promise<ArrayBuffer | null> {
  try {
    console.log(`📥 Downloading blob: ${blobId}`);

    // 1. 从Walrus下载
    const encryptedBlob = await downloadFromWalrus(blobId);

    // 2. 获取解密密钥（优先使用传入的密钥）
    const cryptoKey = await getEncryptionKey(blobId, encryptionKeyBase64, opts);
    if (!cryptoKey) {
      console.error('❌ Cannot decrypt: encryption key not found');
      return null;
    }

    // 3. 解密数据
    const encryptedBuffer = await encryptedBlob.arrayBuffer();
    const encryptedData = new Uint8Array(encryptedBuffer);

    // 提取IV (前12字节)
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);

    console.log(`🔓 Decrypting ${ciphertext.length} bytes...`);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext
    );

    console.log(`✅ Decrypted ${decryptedBuffer.byteLength} bytes`);

    return decryptedBuffer;
  } catch (error) {
    console.error('❌ Download and decrypt failed:', error);
    return null;
  }
}

/**
 * Parse CSV buffer and extract numeric columns by header name
 */
export function parseCsvColumns(buffer: ArrayBuffer): { headers: string[]; columns: Record<string, number[]> } {
  const data = new Uint8Array(buffer);
  const text = new TextDecoder().decode(data);
  // Try CSV via XLSX
  const wb = XLSX.read(text, { type: 'string' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];
  if (!json || json.length === 0) return { headers: [], columns: {} };
  const headers: string[] = (json[0] as string[]).map(h => String(h).trim());
  const columns: Record<string, number[]> = {};
  for (let i = 1; i < json.length; i++) {
    const row: any[] = json[i] as any[];
    for (let c = 0; c < headers.length; c++) {
      const h = headers[c] || `col_${c}`;
      const v = row[c];
      const num = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN);
      if (!Number.isFinite(num)) continue;
      if (!columns[h]) columns[h] = [];
      columns[h].push(num);
    }
  }
  return { headers, columns };
}

/**
 * Choose default numeric column (prefer Chinese '年龄' or English 'age')
 */
export function chooseDefaultNumericColumn(headers: string[]): string | undefined {
  const lowered = headers.map(h => h.toLowerCase());
  const idxAgeZh = headers.findIndex(h => h.includes('年龄'));
  if (idxAgeZh >= 0) return headers[idxAgeZh];
  const idxAgeEn = lowered.findIndex(h => h.includes('age'));
  if (idxAgeEn >= 0) return headers[idxAgeEn];
  // Fallback: first header that is not id/name/sex
  const blacklist = ['id', '编号', '姓名', 'name', '性别', 'gender'];
  for (let i = 0; i < headers.length; i++) {
    const h = lowered[i];
    if (!blacklist.includes(h)) return headers[i];
  }
  return headers[0];
}

/**
 * 从ArrayBuffer中检测文件类型
 */
function detectFileType(buffer: ArrayBuffer, fileName?: string): string {
  // 优先使用文件扩展名
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'xlsx' || ext === 'xls') return 'excel';
    if (ext === 'csv') return 'csv';
    if (ext === 'json') return 'json';
    if (ext === 'txt') return 'text';
  }

  // 检查文件头
  const bytes = new Uint8Array(buffer);

  // Excel (XLSX): starts with PK (zip format)
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return 'excel';
  }

  // CSV/Text: check if it's valid UTF-8 text
  try {
    const text = new TextDecoder('utf-8').decode(bytes.slice(0, 1024));
    if (text.includes(',') || text.includes('\t')) {
      return 'csv';
    }
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return 'json';
    }
    return 'text';
  } catch {
    return 'binary';
  }
}

/**
 * 解析Excel文件,提取数值列
 */
function parseExcel(buffer: ArrayBuffer): number[] {
  console.log('📊 Parsing Excel file...');

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 转换为JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  console.log(`📋 Found ${jsonData.length} rows`);

  // 提取所有数值
  const numbers: number[] = [];

  for (const row of jsonData) {
    for (const cell of row) {
      if (typeof cell === 'number' && !isNaN(cell)) {
        numbers.push(cell);
      } else if (typeof cell === 'string') {
        const parsed = parseFloat(cell);
        if (!isNaN(parsed)) {
          numbers.push(parsed);
        }
      }
    }
  }

  console.log(`✅ Extracted ${numbers.length} numbers from Excel`);
  return numbers;
}

/**
 * 解析CSV文件,提取数值列
 */
function parseCSV(buffer: ArrayBuffer): number[] {
  console.log('📊 Parsing CSV file...');

  const text = new TextDecoder('utf-8').decode(buffer);
  const lines = text.split('\n').filter(line => line.trim());

  console.log(`📋 Found ${lines.length} lines`);

  const numbers: number[] = [];

  for (const line of lines) {
    const cells = line.split(',');
    for (const cell of cells) {
      const trimmed = cell.trim();
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed)) {
        numbers.push(parsed);
      }
    }
  }

  console.log(`✅ Extracted ${numbers.length} numbers from CSV`);
  return numbers;
}

/**
 * 解析JSON文件,提取数值
 */
function parseJSON(buffer: ArrayBuffer): number[] {
  console.log('📊 Parsing JSON file...');

  const text = new TextDecoder('utf-8').decode(buffer);
  const data = JSON.parse(text);

  const numbers: number[] = [];

  // 递归提取所有数字
  function extractNumbers(obj: any) {
    if (typeof obj === 'number' && !isNaN(obj)) {
      numbers.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(extractNumbers);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(extractNumbers);
    }
  }

  extractNumbers(data);

  console.log(`✅ Extracted ${numbers.length} numbers from JSON`);
  return numbers;
}

/**
 * 解析文本文件,提取数值
 */
function parseText(buffer: ArrayBuffer): number[] {
  console.log('📊 Parsing text file...');

  const text = new TextDecoder('utf-8').decode(buffer);
  const numbers: number[] = [];

  // 使用正则表达式匹配所有数字
  const matches = text.match(/[-+]?\d*\.?\d+/g);
  if (matches) {
    for (const match of matches) {
      const parsed = parseFloat(match);
      if (!isNaN(parsed)) {
        numbers.push(parsed);
      }
    }
  }

  console.log(`✅ Extracted ${numbers.length} numbers from text`);
  return numbers;
}

/**
 * 主函数: 解析数据文件并提取数值
 */
export async function parseDataFile(
  buffer: ArrayBuffer,
  fileName?: string
): Promise<number[]> {
  const fileType = detectFileType(buffer, fileName);
  console.log(`🔍 Detected file type: ${fileType}`);

  try {
    switch (fileType) {
      case 'excel':
        return parseExcel(buffer);

      case 'csv':
        return parseCSV(buffer);

      case 'json':
        return parseJSON(buffer);

      case 'text':
        return parseText(buffer);

      default:
        console.warn('⚠️ Unknown file type, attempting to parse as text');
        return parseText(buffer);
    }
  } catch (error) {
    console.error(`❌ Failed to parse file:`, error);
    throw new Error(`Failed to parse ${fileType} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 准备电路输入数据
 * 根据电路要求调整数据数量
 */
export function prepareCircuitInput(
  data: number[],
  circuitType: 'average' | 'threshold'
): number[] {
  const requiredLength = circuitType === 'average' ? 3 : 10;

  if (data.length === 0) {
    throw new Error('No numeric data found in file');
  }

  console.log(`📐 Preparing circuit input: ${data.length} → ${requiredLength} numbers`);

  if (data.length < requiredLength) {
    // 数据不足,用平均值填充
    console.warn(`⚠️ Data too short (${data.length}), padding to ${requiredLength}`);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const padded = [...data];
    while (padded.length < requiredLength) {
      padded.push(Math.round(avg));
    }
    return padded;
  } else if (data.length > requiredLength) {
    console.log(`📊 Sampling ${requiredLength} from ${data.length} data points`);
    const sampled: number[] = [];
    const used = new Set<number>();
    while (sampled.length < requiredLength) {
      const idx = Math.floor(Math.random() * data.length);
      if (!used.has(idx)) {
        used.add(idx);
        sampled.push(data[idx]);
      }
    }
    return sampled;
  } else {
    // 数据刚好
    return data;
  }
}

/**
 * 获取数据统计信息
 */
export function getDataStatistics(data: number[]): {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
} {
  if (data.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0 };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((a, b) => a + b, 0);

  return {
    count: data.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / data.length,
    median: sorted[Math.floor(sorted.length / 2)]
  };
}

