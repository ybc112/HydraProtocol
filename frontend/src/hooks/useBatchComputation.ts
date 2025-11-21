/**
 * Batch Computation Hook
 * 批次计算 Hook：管理大数据集的分批ZKP证明生成和聚合
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import {
  generateBatchAverageProof,
  generateAggregationProof,
  generateBatchThresholdProof,
  generateThresholdAggregationProof
} from '../utils/zkp-browser';
import {
  splitIntoBatches,
  recommendBatchConfig,
  calculateProgress,
  estimateTimeRemaining,
  validateBatchResults,
  prepareAggregationInput,
  saveBatchProgress,
  clearBatchProgress,
  DEFAULT_BATCH_CONFIG,
  type BatchConfig,
  type BatchResult,
  type AggregationResult
} from '../utils/batch-processor';

export interface BatchComputationOptions {
  circuitType: 'average' | 'threshold';
  data: number[];
  threshold?: number;
  config?: Partial<BatchConfig>;
  onProgress?: (progress: number, message: string) => void;
  onBatchComplete?: (batchId: number, result: BatchResult) => void;
}

export function useBatchComputation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const abortRef = useRef(false);
  const batchTimesRef = useRef<number[]>([]);
  
  /**
   * 处理批次平均值计算
   */
  const processBatchAverage = useCallback(async (
    batches: number[][],
    config: BatchConfig,
    options: BatchComputationOptions
  ) => {
    const results: BatchResult[] = [];
    const startTimes: number[] = [];
    
    for (let i = 0; i < batches.length; i++) {
      if (abortRef.current) {
        throw new Error('Computation aborted by user');
      }
      
      setCurrentBatch(i + 1);
      setStatusMessage(`处理批次 ${i + 1}/${batches.length}...`);
      
      const batchStartTime = Date.now();
      startTimes.push(batchStartTime);
      
      try {
        // 生成批次证明
        const { proof, publicSignals } = await generateBatchAverageProof(
          batches[i],
          i
        );
        
        const batchResult: BatchResult = {
          batchId: i,
          average: Number(publicSignals[0]), // 已放大100倍
          count: Number(publicSignals[1]),
          commitment: publicSignals[2],
          proof,
          publicSignals
        };
        
        results.push(batchResult);
        
        // 记录批次处理时间
        const batchTime = (Date.now() - batchStartTime) / 1000;
        batchTimesRef.current.push(batchTime);
        
        // 计算平均批次时间和剩余时间
        const avgBatchTime = batchTimesRef.current.reduce((a, b) => a + b, 0) / batchTimesRef.current.length;
        const remainingTime = estimateTimeRemaining(i + 1, batches.length, avgBatchTime);
        
        // 更新进度
        const currentProgress = calculateProgress(i + 1, batches.length, false);
        setProgress(currentProgress);
        
        if (options.onProgress) {
          options.onProgress(currentProgress, `批次 ${i + 1}/${batches.length} 完成 (剩余约 ${remainingTime} 秒)`);
        }
        
        if (options.onBatchComplete) {
          options.onBatchComplete(i, batchResult);
        }
        
        // 定期保存进度
        if ((i + 1) % 5 === 0) {
          saveBatchProgress('current', results, config);
        }
        
      } catch (err) {
        console.error(`批次 ${i} 处理失败:`, err);
        throw new Error(`批次 ${i} 处理失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    }
    
    return results;
  }, []);
  
  /**
   * 处理批次阈值查询
   */
  const processBatchThreshold = useCallback(async (
    batches: number[][],
    threshold: number,
    config: BatchConfig,
    options: BatchComputationOptions
  ) => {
    const results: BatchResult[] = [];
    const salt = Math.floor(Math.random() * 1000000);
    
    for (let i = 0; i < batches.length; i++) {
      if (abortRef.current) {
        throw new Error('Computation aborted by user');
      }
      
      setCurrentBatch(i + 1);
      setStatusMessage(`处理批次 ${i + 1}/${batches.length}...`);
      
      const batchStartTime = Date.now();
      
      try {
        // 生成批次证明
        const { proof, publicSignals } = await generateBatchThresholdProof(
          batches[i],
          threshold,
          i,
          salt + i
        );
        
        const batchResult: BatchResult = {
          batchId: i,
          average: 0, // 阈值查询不需要平均值
          count: Number(publicSignals[0]), // 满足条件的数量
          commitment: publicSignals[1],
          proof,
          publicSignals
        };
        
        results.push(batchResult);
        
        // 记录批次处理时间
        const batchTime = (Date.now() - batchStartTime) / 1000;
        batchTimesRef.current.push(batchTime);
        
        // 更新进度
        const currentProgress = calculateProgress(i + 1, batches.length, false);
        setProgress(currentProgress);
        
        if (options.onProgress) {
          const avgBatchTime = batchTimesRef.current.reduce((a, b) => a + b, 0) / batchTimesRef.current.length;
          const remainingTime = estimateTimeRemaining(i + 1, batches.length, avgBatchTime);
          options.onProgress(currentProgress, `批次 ${i + 1}/${batches.length} 完成 (剩余约 ${remainingTime} 秒)`);
        }
        
        if (options.onBatchComplete) {
          options.onBatchComplete(i, batchResult);
        }
        
      } catch (err) {
        console.error(`批次 ${i} 处理失败:`, err);
        throw new Error(`批次 ${i} 处理失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    }
    
    return results;
  }, []);
  
  /**
   * 执行批次计算
   */
  const computeBatch = useCallback(async (
    options: BatchComputationOptions
  ) => {
    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);
      setBatchResults([]);
      abortRef.current = false;
      batchTimesRef.current = [];
      
      // 推荐批次配置
      const recommendedConfig = recommendBatchConfig(options.data.length);
      const finalConfig: BatchConfig = {
        ...recommendedConfig,
        ...options.config
      };
      
      console.log('🚀 开始批次计算', {
        dataSize: options.data.length,
        batchSize: finalConfig.batchSize,
        estimatedBatches: Math.ceil(options.data.length / finalConfig.batchSize)
      });
      
      setStatusMessage('正在分批数据...');
      
      // 分批数据
      const batches = splitIntoBatches(options.data, finalConfig);
      setTotalBatches(batches.length);
      
      console.log(`📊 数据已分成 ${batches.length} 批`);
      
      // 处理批次
      let batchResults: BatchResult[];
      
      if (options.circuitType === 'average') {
        batchResults = await processBatchAverage(batches, finalConfig, options);
      } else {
        if (!options.threshold) {
          throw new Error('阈值查询需要提供 threshold 参数');
        }
        batchResults = await processBatchThreshold(batches, options.threshold, finalConfig, options);
      }
      
      setBatchResults(batchResults);
      
      // 验证批次结果
      if (!validateBatchResults(batchResults)) {
        throw new Error('批次结果验证失败');
      }
      
      // 聚合阶段
      setStatusMessage('正在聚合批次结果...');
      setProgress(90);
      
      if (options.onProgress) {
        options.onProgress(90, '正在聚合批次结果...');
      }
      
      console.log('🔄 开始聚合批次结果...');
      
      let aggregationResult: AggregationResult;
      
      if (options.circuitType === 'average') {
        // 准备聚合输入
        const aggregationInput = prepareAggregationInput(batchResults, finalConfig.maxBatches);
        
        // 生成聚合证明
        const { proof, publicSignals } = await generateAggregationProof(
          aggregationInput.batchAverages,
          aggregationInput.batchCounts,
          aggregationInput.batchCommitments,
          batchResults.length
        );
        
        // 注意：电路返回的 publicSignals[0] 是加权和，不是平均值
        // 需要除以 totalCount 得到真正的平均值
        const weightedSum = Number(publicSignals[0]);
        const totalCount = Number(publicSignals[1]);
        const realAverage = totalCount > 0 ? weightedSum / totalCount : 0;
        
        aggregationResult = {
          finalAverage: realAverage,
          totalCount: totalCount,
          commitment: publicSignals[2],
          proof,
          publicSignals,
          batchResults
        };
      } else {
        // 阈值聚合
        const batchCounts = new Array(finalConfig.maxBatches).fill('0');
        const batchCommitments = new Array(finalConfig.maxBatches).fill('0');
        
        for (let i = 0; i < batchResults.length; i++) {
          batchCounts[i] = String(batchResults[i].count);
          batchCommitments[i] = batchResults[i].commitment;
        }
        
        const { proof, publicSignals } = await generateThresholdAggregationProof(
          batchCounts,
          batchCommitments,
          batchResults.length
        );
        
        aggregationResult = {
          finalAverage: 0,
          totalCount: Number(publicSignals[0]), // 总共满足条件的数量
          commitment: publicSignals[1],
          proof,
          publicSignals,
          batchResults
        };
      }
      
      setProgress(100);
      setStatusMessage('计算完成！');
      
      if (options.onProgress) {
        options.onProgress(100, '计算完成！');
      }
      
      // 清除保存的进度
      clearBatchProgress('current');
      
      console.log('✅ 批次计算完成', aggregationResult);
      
      return aggregationResult;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      console.error('❌ 批次计算失败:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [processBatchAverage, processBatchThreshold]);
  
  /**
   * 中止计算
   */
  const abortComputation = useCallback(() => {
    abortRef.current = true;
    setStatusMessage('正在中止计算...');
  }, []);
  
  return {
    computeBatch,
    abortComputation,
    isProcessing,
    progress,
    currentBatch,
    totalBatches,
    statusMessage,
    batchResults,
    error
  };
}
