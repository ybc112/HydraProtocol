pragma circom 2.1.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

template Average(n) {
    signal input data[n];
    signal output avg;
    signal output commitment;

    var sum = 0;
    for (var i = 0; i < n; i++) {
        sum = sum + data[i];
    }

    signal tempSum;
    tempSum <== sum;

    // Calculate average (integer division)
    // avg * n should equal sum (within bounds)
    var avgValue = sum / n;
    avg <== avgValue;

    // Verify that avg is correct: sum - avg*n < n
    component lt = LessThan(64);
    lt.in[0] <== tempSum - avg * n;
    lt.in[1] <== n;
    lt.out === 1;

    component hasher = Poseidon(n);
    for (var i = 0; i < n; i++) {
        hasher.inputs[i] <== data[i];
    }
    commitment <== hasher.out;

    component rangeChecks[n];
    for (var i = 0; i < n; i++) {
        rangeChecks[i] = Num2Bits(32);
        rangeChecks[i].in <== data[i];
    }
}

// 数据保持私有，输出（avg, commitment）自动公开
component main = Average(3);
