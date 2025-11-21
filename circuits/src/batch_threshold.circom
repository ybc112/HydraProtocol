pragma circom 2.1.0;

/*
 * Batch Threshold Query Circuit
 * 
 * 功能：统计批次中满足阈值条件的数据数量
 * 用于分批聚合计算的第一阶段
 * 
 * 输入：
 *   - data[n]: 批次数据
 *   - threshold: 阈值
 *   - batchId: 批次编号
 *   - salt: 随机盐值
 * 
 * 输出：
 *   - count: 大于阈值的数据数量
 *   - commitment: 数据承诺
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template BatchThreshold(n) {
    signal input data[n];
    signal input threshold;
    signal input batchId;
    signal input salt;
    
    signal output count;
    signal output commitment;
    
    // 比较每个数据与阈值
    component comparators[n];
    signal isAboveThreshold[n];
    
    for (var i = 0; i < n; i++) {
        comparators[i] = GreaterThan(32);
        comparators[i].in[0] <== data[i];
        comparators[i].in[1] <== threshold;
        isAboveThreshold[i] <== comparators[i].out;
    }
    
    // 计算总数
    var totalCount = 0;
    for (var i = 0; i < n; i++) {
        totalCount = totalCount + isAboveThreshold[i];
    }
    count <== totalCount;
    
    // 生成承诺（分层哈希策略）
    // 第一层：分组哈希（100个数据分成17组）
    component groupHashers[17];
    signal groupHashes[17];
    
    for (var g = 0; g < 17; g++) {
        groupHashers[g] = Poseidon(6);
        for (var i = 0; i < 6; i++) {
            var dataIdx = g * 6 + i;
            if (dataIdx < n) {
                groupHashers[g].inputs[i] <== data[dataIdx];
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
    
    // 第三层：最终哈希
    component finalHasher = Poseidon(7);
    finalHasher.inputs[0] <== batchId;
    finalHasher.inputs[1] <== threshold;
    finalHasher.inputs[2] <== salt;
    finalHasher.inputs[3] <== count;
    finalHasher.inputs[4] <== layer2Hashes[0];
    finalHasher.inputs[5] <== layer2Hashes[1];
    finalHasher.inputs[6] <== layer2Hashes[2];
    commitment <== finalHasher.out;
}

// 批次大小：100 个数据点
component main {public [threshold]} = BatchThreshold(100);
