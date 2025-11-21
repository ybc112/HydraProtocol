pragma circom 2.1.0;

/*
 * Batch Average Circuit
 * 
 * 功能：计算一个批次数据的平均值
 * 用于分批聚合计算的第一阶段
 * 
 * 输入：
 *   - data[n]: 批次数据（100-500个数据点）
 *   - batchId: 批次编号（用于标识和排序）
 * 
 * 输出：
 *   - avg: 批次平均值
 *   - count: 实际数据数量
 *   - commitment: 数据承诺（Poseidon 哈希）
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

template BatchAverage(n) {
    signal input data[n];
    signal input batchId;
    
    signal output avg;
    signal output count;
    signal output commitment;
    
    // 计算总和
    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum = sum + data[i];
    }
    
    signal tempSum;
    tempSum <== sum;
    
    // 计算平均值（整数除法）
    // 使用定点数：放大 100 倍以保留两位小数
    var avgValue = (sum * 100) / n;
    avg <== avgValue;
    
    // 验证平均值正确性
    // sum * 100 - avg * n < n * 100
    component lt = LessThan(64);
    lt.in[0] <== tempSum * 100 - avg * n;
    lt.in[1] <== n * 100;
    lt.out === 1;
    
    // 输出数据数量（固定为 n）
    count <== n;
    
    // 生成数据承诺
    // 策略：分层哈希 - 将100个数据分成多组，每组哈希后再合并
    // 每组最多6个数据 (Poseidon最多支持16个输入)
    
    // 第一层：分组哈希（100个数据分成17组，每组6个）
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
    
    // 第二层：合并组哈希（17组分成3批）
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
    
    // 第三层：最终哈希（包含 batchId + 3个layer2哈希 + sum + avg）
    component finalHasher = Poseidon(6);
    finalHasher.inputs[0] <== batchId;
    finalHasher.inputs[1] <== layer2Hashes[0];
    finalHasher.inputs[2] <== layer2Hashes[1];
    finalHasher.inputs[3] <== layer2Hashes[2];
    finalHasher.inputs[4] <== tempSum;
    finalHasher.inputs[5] <== avg;
    commitment <== finalHasher.out;
    
    // 范围检查：确保数据在合理范围内
    component rangeChecks[n];
    for (var i = 0; i < n; i++) {
        rangeChecks[i] = Num2Bits(32);
        rangeChecks[i].in <== data[i];
    }
}

// 批次大小：100 个数据点
// 这是性能和精度的平衡点
component main = BatchAverage(100);
