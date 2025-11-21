/**
 * Batch Processing Utilities
 * 分批处理工具：将大数据集分批处理并聚合结果
 */

'use client';

export interface BatchConfig {
  batchSize: number;      // 每批数据数量
  maxBatches: number;     // 最大批次数量
  parallelism: number;    // 并行处理批次数
}

export interface BatchResult {
  batchId: number;
  average: number;        // 批次平均值（已放大100倍）
  count: number;          // 批次数据数量
  commitment: string;     // 批次承诺
  proof: any;             // ZKP 证明
  publicSignals: string[];
}

export interface AggregationResult {
  finalAverage: number;   // 最终平均值
  totalCount: number;     // 总数据数量
  commitment: string;     // 聚合承诺
  proof: any;             // 聚合证明
  publicSignals: string[];
  batchResults: BatchResult[];
}

/**
 * 默认批次配置
 */
export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  batchSize: 100,         // 每批100个数据点
  maxBatches: 100,        // 最多100批次（支持10,000个数据点）
  parallelism: 3          // 同时处理3个批次
};

/**
 * 根据数据量智能推荐批次配置
 */
export function recommendBatchConfig(dataSize: number): BatchConfig {
  if (dataSize <= 100) {
    // 小数据集：直接使用单批次
    return {
      batchSize: 100,
      maxBatches: 1,
      parallelism: 1
    };
  } else if (dataSize <= 500) {
    // 中等数据集：100个/批
    return {
      batchSize: 100,
      maxBatches: Math.ceil(dataSize / 100),
      parallelism: 2
    };
  } else if (dataSize <= 2000) {
    // 较大数据集：200个/批
    return {
      batchSize: 200,
      maxBatches: Math.ceil(dataSize / 200),
      parallelism: 3
    };
  } else {
    // 大数据集：500个/批
    return {
      batchSize: 500,
      maxBatches: Math.min(100, Math.ceil(dataSize / 500)),
      parallelism: 4
    };
  }
}

/**
 * 将数据分批
 */
export function splitIntoBatches(
  data: number[],
  config: BatchConfig = DEFAULT_BATCH_CONFIG
): number[][] {
  const batches: number[][] = [];
  const { batchSize, maxBatches } = config;
  
  for (let i = 0; i < data.length && batches.length < maxBatches; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    // 如果批次不足 batchSize，用 0 填充
    while (batch.length < batchSize) {
      batch.push(0);
    }
    
    batches.push(batch);
  }
  
  return batches;
}

/**
 * 计算处理进度
 */
export function calculateProgress(
  completedBatches: number,
  totalBatches: number,
  isAggregating: boolean = false
): number {
  if (isAggregating) {
    // 聚合阶段占10%的进度
    return 90 + 10;
  }
  
  // 批次处理占90%的进度
  return Math.floor((completedBatches / totalBatches) * 90);
}

/**
 * 估算剩余时间（秒）
 */
export function estimateTimeRemaining(
  completedBatches: number,
  totalBatches: number,
  avgBatchTime: number
): number {
  if (completedBatches === 0) {
    return totalBatches * avgBatchTime;
  }
  
  const remainingBatches = totalBatches - completedBatches;
  return Math.ceil(remainingBatches * avgBatchTime);
}

/**
 * 格式化时间显示
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} 秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes} 分 ${secs} 秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} 小时 ${minutes} 分`;
  }
}

/**
 * 验证批次结果完整性
 */
export function validateBatchResults(results: BatchResult[]): boolean {
  if (results.length === 0) {
    return false;
  }
  
  for (const result of results) {
    if (!result.proof || !result.publicSignals || !result.commitment) {
      return false;
    }
    
    if (result.count <= 0 || result.average < 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * 计算批次统计信息
 */
export function getBatchStatistics(results: BatchResult[]): {
  totalData: number;
  avgMin: number;
  avgMax: number;
  avgMean: number;
} {
  if (results.length === 0) {
    return { totalData: 0, avgMin: 0, avgMax: 0, avgMean: 0 };
  }
  
  const totalData = results.reduce((sum, r) => sum + r.count, 0);
  const averages = results.map(r => r.average / 100); // 除以100还原真实值
  
  return {
    totalData,
    avgMin: Math.min(...averages),
    avgMax: Math.max(...averages),
    avgMean: averages.reduce((sum, avg) => sum + avg, 0) / averages.length
  };
}

/**
 * 准备聚合电路输入
 * 注意：聚合电路固定需要 100 个批次的输入数组
 */
export function prepareAggregationInput(
  batchResults: BatchResult[],
  maxBatches: number = 100
): {
  batchAverages: string[];
  batchCounts: string[];
  batchCommitments: string[];
  numBatches: string;
} {
  const batchAverages: string[] = [];
  const batchCounts: string[] = [];
  const batchCommitments: string[] = [];
  
  // 聚合电路固定需要 100 个元素的数组
  const CIRCUIT_MAX_BATCHES = 100;
  
  // 填充有效批次数据
  for (let i = 0; i < CIRCUIT_MAX_BATCHES; i++) {
    if (i < batchResults.length) {
      const result = batchResults[i];
      batchAverages.push(String(result.average));
      batchCounts.push(String(result.count));
      batchCommitments.push(result.commitment);
    } else {
      // 填充空批次（不会被计算）
      batchAverages.push('0');
      batchCounts.push('0');
      batchCommitments.push('0');
    }
  }
  
  return {
    batchAverages,
    batchCounts,
    batchCommitments,
    numBatches: String(batchResults.length)
  };
}

/**
 * 保存批次处理进度到本地存储
 */
export function saveBatchProgress(
  jobId: string,
  batchResults: BatchResult[],
  config: BatchConfig
): void {
  if (typeof window === 'undefined') return;
  
  const progress = {
    jobId,
    timestamp: Date.now(),
    batchResults,
    config
  };
  
  try {
    localStorage.setItem(`batch_progress_${jobId}`, JSON.stringify(progress));
  } catch (error) {
    console.warn('Failed to save batch progress:', error);
  }
}

/**
 * 从本地存储恢复批次处理进度
 */
export function loadBatchProgress(jobId: string): {
  batchResults: BatchResult[];
  config: BatchConfig;
} | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(`batch_progress_${jobId}`);
    if (!data) return null;
    
    const progress = JSON.parse(data);
    
    // 检查是否过期（24小时）
    if (Date.now() - progress.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`batch_progress_${jobId}`);
      return null;
    }
    
    return {
      batchResults: progress.batchResults,
      config: progress.config
    };
  } catch (error) {
    console.warn('Failed to load batch progress:', error);
    return null;
  }
}

/**
 * 清除批次处理进度
 */
export function clearBatchProgress(jobId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(`batch_progress_${jobId}`);
  } catch (error) {
    console.warn('Failed to clear batch progress:', error);
  }
}
