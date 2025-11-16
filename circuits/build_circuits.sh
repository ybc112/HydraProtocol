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

echo ""
echo "📦 编译 average.circom..."
circom src/average.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/average

echo ""
echo "📦 编译 threshold.circom..."
circom src/threshold.circom \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -l node_modules -o build/threshold

echo ""
echo "🔑 生成Powers of Tau..."
# 对于小电路，phase 1使用12就够了（支持最多2^12个约束）
if [ ! -f build/pot12_0000.ptau ]; then
    snarkjs powersoftau new bn128 12 build/pot12_0000.ptau -v
    snarkjs powersoftau contribute build/pot12_0000.ptau build/pot12_0001.ptau \
        --name="First contribution" -v -e="random entropy"
    snarkjs powersoftau prepare phase2 build/pot12_0001.ptau build/pot12_final.ptau -v
fi

echo ""
echo "🔑 为average电路生成zkey..."
snarkjs groth16 setup build/average/average.r1cs build/pot12_final.ptau build/average/circuit_0000.zkey
snarkjs zkey contribute build/average/circuit_0000.zkey build/average/circuit_final.zkey \
    --name="Average circuit contribution" -v -e="more random entropy"
snarkjs zkey export verificationkey build/average/circuit_final.zkey build/average/verification_key.json

echo ""
echo "🔑 为threshold电路生成zkey..."
snarkjs groth16 setup build/threshold/threshold.r1cs build/pot12_final.ptau build/threshold/circuit_0000.zkey
snarkjs zkey contribute build/threshold/circuit_0000.zkey build/threshold/circuit_final.zkey \
    --name="Threshold circuit contribution" -v -e="even more random entropy"
snarkjs zkey export verificationkey build/threshold/circuit_final.zkey build/threshold/verification_key.json

echo ""
echo "✅ 编译完成！"
echo ""
echo "📁 生成的文件："
echo "   - build/average/average.wasm"
echo "   - build/average/circuit_final.zkey"
echo "   - build/average/verification_key.json"
echo "   - build/threshold/threshold.wasm"
echo "   - build/threshold/circuit_final.zkey"
echo "   - build/threshold/verification_key.json"
echo ""
echo "💡 下一步："
echo "   1. 使用wasm文件生成witness"
echo "   2. 使用zkey文件生成proof"
echo "   3. 使用verification_key验证proof"
