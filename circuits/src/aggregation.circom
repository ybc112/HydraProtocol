pragma circom 2.1.0;

/*
 * Aggregation Circuit
 * 
 * 功能：聚合多个批次的计算结果
 * 用于分批聚合计算的第二阶段
 * 
 * 输入：
 *   - batchAverages[maxBatches]: 各批次平均值（已放大100倍）
 *   - batchCounts[maxBatches]: 各批次数据数量
 *   - batchCommitments[maxBatches]: 各批次数据承诺
 *   - numBatches: 实际批次数量
 * 
 * 输出：
 *   - finalAverage: 加权总和（注意：不是平均值！前端需除以totalCount）
 *   - totalCount: 总数据数量
 *   - aggregateCommitment: 聚合承诺
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

template Aggregation(maxBatches) {
    signal input batchAverages[maxBatches];
    signal input batchCounts[maxBatches];
    signal input batchCommitments[maxBatches];
    signal input numBatches;
    
    signal output finalAverage;
    signal output totalCount;
    signal output aggregateCommitment;
    
    // 计算加权总和（使用信号数组）
    // 策略：直接对所有批次求和，无效批次的值为0不影响结果
    signal batchSums[maxBatches];
    signal partialWeightedSums[maxBatches + 1];
    signal partialCounts[maxBatches + 1];
    
    partialWeightedSums[0] <== 0;
    partialCounts[0] <== 0;
    
    for (var i = 0; i < maxBatches; i++) {
        // 计算批次加权和: (batchAverage * batchCount) / 100
        // 注意: batchAverage 已经放大了 100 倍
        batchSums[i] <== (batchAverages[i] * batchCounts[i]) / 100;
        
        // 累加
        partialWeightedSums[i + 1] <== partialWeightedSums[i] + batchSums[i];
        partialCounts[i + 1] <== partialCounts[i] + batchCounts[i];
    }
    
    // 总加权和与总数据量
    signal tempWeightedSum;
    signal tempTotalCount;
    tempWeightedSum <== partialWeightedSums[maxBatches];
    tempTotalCount <== partialCounts[maxBatches];
    totalCount <== tempTotalCount;
    
    // 简化方案：直接输出加权和（已经放大了100倍），前端做最终除法
    // 这样避免在电路内处理复杂的除法约束
    // finalAverage 实际上是 (sum of all data * 100) / totalCount
    // 等价于 tempWeightedSum * 100 / tempTotalCount
    
    // 输出加权和（作为 finalAverage，但实际是加权总和）
    // 前端需要除以 totalCount 得到真正的平均值
    finalAverage <== tempWeightedSum;
    
    // 生成聚合承诺（分层哈希策略）
    // 第一层：分组哈希（100个承诺分成17组）
    component groupHashers[17];
    signal groupHashes[17];
    
    for (var g = 0; g < 17; g++) {
        groupHashers[g] = Poseidon(6);
        for (var i = 0; i < 6; i++) {
            var commitIdx = g * 6 + i;
            if (commitIdx < maxBatches) {
                groupHashers[g].inputs[i] <== batchCommitments[commitIdx];
            } else {
                groupHashers[g].inputs[i] <== 0;
            }
        }
        groupHashes[g] <== groupHashers[g].out;
    }
    
    // 第二层：合并组哈希
    component layer2Hashers[3];
    signal layer2Hashes[3];
    
    for (var g = 0; g < 3; g++) {
        layer2Hashers[g] = Poseidon(6);
        for (var i = 0; i < 6; i++) {
            var groupIdx = g * 6 + i;
            if (groupIdx < 17) {
                layer2Hashers[g].inputs[i] <== groupHashes[groupIdx];
            } else {
                layer2Hashers[g].inputs[i] <== 0;
            }
        }
        layer2Hashes[g] <== layer2Hashers[g].out;
    }
    
    // 第三层：最终承诺
    component finalHasher = Poseidon(6);
    finalHasher.inputs[0] <== numBatches;
    finalHasher.inputs[1] <== finalAverage;
    finalHasher.inputs[2] <== totalCount;
    finalHasher.inputs[3] <== layer2Hashes[0];
    finalHasher.inputs[4] <== layer2Hashes[1];
    finalHasher.inputs[5] <== layer2Hashes[2];
    aggregateCommitment <== finalHasher.out;
    
    // 验证批次数量合法
    component batchCountCheck = LessThan(32);
    batchCountCheck.in[0] <== numBatches;
    batchCountCheck.in[1] <== maxBatches + 1;
    batchCountCheck.out === 1;
    
    // 验证总数据量非零
    component isZero = IsZero();
    isZero.in <== totalCount;
    isZero.out === 0;
}

// 最多支持 100 个批次
// 即：100 批次 × 100 数据点/批次 = 10,000 个数据点
component main {public [numBatches]} = Aggregation(100);
