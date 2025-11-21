pragma circom 2.1.0;

/*
 * Threshold Aggregation Circuit
 * 
 * 功能：聚合多个批次的阈值查询结果
 * 用于分批阈值查询的第二阶段
 * 
 * 输入：
 *   - batchCounts[maxBatches]: 各批次满足条件的数量
 *   - batchCommitments[maxBatches]: 各批次承诺
 *   - numBatches: 实际批次数量
 * 
 * 输出：
 *   - totalCount: 总共满足条件的数据数量
 *   - aggregateCommitment: 聚合承诺
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template ThresholdAggregation(maxBatches) {
    signal input batchCounts[maxBatches];
    signal input batchCommitments[maxBatches];
    signal input numBatches;
    
    signal output totalCount;
    signal output aggregateCommitment;
    
    // 计算总数（使用信号数组）
    // 策略：直接对所有批次求和，无效批次的值为0不影响结果
    signal partialSums[maxBatches + 1];
    partialSums[0] <== 0;
    
    for (var i = 0; i < maxBatches; i++) {
        partialSums[i + 1] <== partialSums[i] + batchCounts[i];
    }
    
    totalCount <== partialSums[maxBatches];
    
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
    component finalHasher = Poseidon(5);
    finalHasher.inputs[0] <== numBatches;
    finalHasher.inputs[1] <== totalCount;
    finalHasher.inputs[2] <== layer2Hashes[0];
    finalHasher.inputs[3] <== layer2Hashes[1];
    finalHasher.inputs[4] <== layer2Hashes[2];
    aggregateCommitment <== finalHasher.out;
    
    // 验证批次数量合法
    component batchCountCheck = LessThan(32);
    batchCountCheck.in[0] <== numBatches;
    batchCountCheck.in[1] <== maxBatches + 1;
    batchCountCheck.out === 1;
}

// 最多支持 100 个批次
component main {public [numBatches]} = ThresholdAggregation(100);
