pragma circom 2.1.0;

/*
 * Threshold Query Circuit
 *
 * 功能：统计满足阈值条件的数据数量，不泄露具体数值
 *
 * 输入：
 *   - data[n]: n个数据值
 *   - threshold: 阈值
 *
 * 输出：
 *   - count: 大于阈值的数据数量
 *   - commitment: 数据承诺
 */

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

template ThresholdQuery(n) {
    signal input data[n];
    signal input threshold;
    signal input salt;  // 随机盐值，用于承诺

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

    // 计算承诺
    component hasher = Poseidon(n + 1);
    for (var i = 0; i < n; i++) {
        hasher.inputs[i] <== data[i];
    }
    hasher.inputs[n] <== salt;
    commitment <== hasher.out;
}

// threshold 公开，data 和 salt 私有，输出（count, commitment）自动公开
component main {public [threshold]} = ThresholdQuery(10);
