#!/bin/bash

# Circom电路编译脚本
# 用途：将.circom源文件编译为可用的证明系统

set -e

echo "🔧 开始编译Circom电路..."

# 检查circom是否安装
if ! command -v circom &> /dev/null; then
    echo "❌ Circom未安装，请先安装："
    echo "   npm install -g circom"
    exit 1
fi

# 检查snarkjs是否安装
if ! command -v snarkjs &> /dev/null; then
    echo "❌ SnarkJS未安装，请先安装："
    echo "   npm install -g snarkjs"
    exit 1
fi

# 创建输出目录
mkdir -p build/average
mkdir -p build/threshold
mkdir -p build/batch_average
mkdir -p build/aggregation
mkdir -p build/batch_threshold
mkdir -p build/threshold_aggregation

echo ""
echo "📦 编译 average.circom (旧版，保持兼容)..."
circom src/average.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/average

echo ""
echo "📦 编译 threshold.circom (旧版，保持兼容)..."
circom src/threshold.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/threshold

echo ""
echo "📦 编译 batch_average.circom (批次平均值)..."
circom src/batch_average.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/batch_average

echo ""
echo "📦 编译 aggregation.circom (平均值聚合)..."
circom src/aggregation.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/aggregation

echo ""
echo "📦 编译 batch_threshold.circom (批次阈值查询)..."
circom src/batch_threshold.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/batch_threshold

echo ""
echo "📦 编译 threshold_aggregation.circom (阈值聚合)..."
circom src/threshold_aggregation.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/threshold_aggregation

echo ""
echo "🔑 生成Powers of Tau..."
# 批次电路较大，需要使用16（支持最多2^16=65536个约束）
# 这足以支持 batch_average (23679 wires) 和其他大电路
if [ ! -f build/pot16_0000.ptau ]; then
    echo "生成 pot16 (这可能需要几分钟)..."
    snarkjs powersoftau new bn128 16 build/pot16_0000.ptau -v
    snarkjs powersoftau contribute build/pot16_0000.ptau build/pot16_0001.ptau \
        --name="First contribution" -v -e="random entropy"
    snarkjs powersoftau prepare phase2 build/pot16_0001.ptau build/pot16_final.ptau -v
fi

echo ""
echo "🔑 为average电路生成zkey (使用 pot16)..."
snarkjs groth16 setup build/average/average.r1cs build/pot16_final.ptau build/average/circuit_0000.zkey
snarkjs zkey contribute build/average/circuit_0000.zkey build/average/circuit_final.zkey \
    --name="Average circuit contribution" -v -e="more random entropy"
snarkjs zkey export verificationkey build/average/circuit_final.zkey build/average/verification_key.json

echo ""
echo "🔑 为threshold电路生成zkey (使用 pot16)..."
snarkjs groth16 setup build/threshold/threshold.r1cs build/pot16_final.ptau build/threshold/circuit_0000.zkey
snarkjs zkey contribute build/threshold/circuit_0000.zkey build/threshold/circuit_final.zkey \
    --name="Threshold circuit contribution" -v -e="even more random entropy"
snarkjs zkey export verificationkey build/threshold/circuit_final.zkey build/threshold/verification_key.json

echo ""
echo "🔑 为batch_average电路生成zkey (使用 pot16)..."
snarkjs groth16 setup build/batch_average/batch_average.r1cs build/pot16_final.ptau build/batch_average/circuit_0000.zkey
snarkjs zkey contribute build/batch_average/circuit_0000.zkey build/batch_average/circuit_final.zkey \
    --name="Batch average contribution" -v -e="batch random entropy"
snarkjs zkey export verificationkey build/batch_average/circuit_final.zkey build/batch_average/verification_key.json

echo ""
echo "🔑 为aggregation电路生成zkey (使用 pot16)..."
snarkjs groth16 setup build/aggregation/aggregation.r1cs build/pot16_final.ptau build/aggregation/circuit_0000.zkey
snarkjs zkey contribute build/aggregation/circuit_0000.zkey build/aggregation/circuit_final.zkey \
    --name="Aggregation contribution" -v -e="aggregation entropy"
snarkjs zkey export verificationkey build/aggregation/circuit_final.zkey build/aggregation/verification_key.json

echo ""
echo "🔑 为batch_threshold电路生成zkey (使用 pot16)..."
snarkjs groth16 setup build/batch_threshold/batch_threshold.r1cs build/pot16_final.ptau build/batch_threshold/circuit_0000.zkey
snarkjs zkey contribute build/batch_threshold/circuit_0000.zkey build/batch_threshold/circuit_final.zkey \
    --name="Batch threshold contribution" -v -e="batch threshold entropy"
snarkjs zkey export verificationkey build/batch_threshold/circuit_final.zkey build/batch_threshold/verification_key.json

echo ""
echo "🔑 为threshold_aggregation电路生成zkey (使用 pot16)..."
snarkjs groth16 setup build/threshold_aggregation/threshold_aggregation.r1cs build/pot16_final.ptau build/threshold_aggregation/circuit_0000.zkey
snarkjs zkey contribute build/threshold_aggregation/circuit_0000.zkey build/threshold_aggregation/circuit_final.zkey \
    --name="Threshold aggregation contribution" -v -e="threshold agg entropy"
snarkjs zkey export verificationkey build/threshold_aggregation/circuit_final.zkey build/threshold_aggregation/verification_key.json

echo ""
echo "✅ 编译完成！"
echo ""
echo "📁 生成的文件："
echo "   旧版电路（兼容）："
echo "   - build/average/average.wasm"
echo "   - build/average/circuit_final.zkey"
echo "   - build/average/verification_key.json"
echo "   - build/threshold/threshold.wasm"
echo "   - build/threshold/circuit_final.zkey"
echo "   - build/threshold/verification_key.json"
echo ""
echo "   新版批次电路："
echo "   - build/batch_average/batch_average.wasm"
echo "   - build/batch_average/circuit_final.zkey"
echo "   - build/batch_average/verification_key.json"
echo "   - build/aggregation/aggregation.wasm"
echo "   - build/aggregation/circuit_final.zkey"
echo "   - build/aggregation/verification_key.json"
echo "   - build/batch_threshold/batch_threshold.wasm"
echo "   - build/batch_threshold/circuit_final.zkey"
echo "   - build/batch_threshold/verification_key.json"
echo "   - build/threshold_aggregation/threshold_aggregation.wasm"
echo "   - build/threshold_aggregation/circuit_final.zkey"
echo "   - build/threshold_aggregation/verification_key.json"
echo ""
echo "💡 下一步："
echo "   1. 使用wasm文件生成witness"
echo "   2. 使用zkey文件生成proof"
echo "   3. 使用verification_key验证proof"
