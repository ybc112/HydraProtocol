#!/bin/bash

# 复制电路文件到前端 public 目录
# 用途：将编译好的 wasm 和 zkey 文件部署到前端

set -e

echo "📦 开始复制电路文件到前端..."

# 创建前端目录
FRONTEND_DIR="../frontend/public/circuits"
mkdir -p "$FRONTEND_DIR/average"
mkdir -p "$FRONTEND_DIR/threshold"
mkdir -p "$FRONTEND_DIR/batch_average"
mkdir -p "$FRONTEND_DIR/aggregation"
mkdir -p "$FRONTEND_DIR/batch_threshold"
mkdir -p "$FRONTEND_DIR/threshold_aggregation"

# 复制旧版电路（保持兼容）
echo "📁 复制 average 电路..."
cp build/average/average_js/average.wasm "$FRONTEND_DIR/average/"
cp build/average/circuit_final.zkey "$FRONTEND_DIR/average/"
cp build/average/verification_key.json "$FRONTEND_DIR/average/"

echo "📁 复制 threshold 电路..."
cp build/threshold/threshold_js/threshold.wasm "$FRONTEND_DIR/threshold/"
cp build/threshold/circuit_final.zkey "$FRONTEND_DIR/threshold/"
cp build/threshold/verification_key.json "$FRONTEND_DIR/threshold/"

# 复制新版批次电路
echo "📁 复制 batch_average 电路..."
cp build/batch_average/batch_average_js/batch_average.wasm "$FRONTEND_DIR/batch_average/"
cp build/batch_average/circuit_final.zkey "$FRONTEND_DIR/batch_average/"
cp build/batch_average/verification_key.json "$FRONTEND_DIR/batch_average/"

echo "📁 复制 aggregation 电路..."
cp build/aggregation/aggregation_js/aggregation.wasm "$FRONTEND_DIR/aggregation/"
cp build/aggregation/circuit_final.zkey "$FRONTEND_DIR/aggregation/"
cp build/aggregation/verification_key.json "$FRONTEND_DIR/aggregation/"

echo "📁 复制 batch_threshold 电路..."
cp build/batch_threshold/batch_threshold_js/batch_threshold.wasm "$FRONTEND_DIR/batch_threshold/"
cp build/batch_threshold/circuit_final.zkey "$FRONTEND_DIR/batch_threshold/"
cp build/batch_threshold/verification_key.json "$FRONTEND_DIR/batch_threshold/"

echo "📁 复制 threshold_aggregation 电路..."
cp build/threshold_aggregation/threshold_aggregation_js/threshold_aggregation.wasm "$FRONTEND_DIR/threshold_aggregation/"
cp build/threshold_aggregation/circuit_final.zkey "$FRONTEND_DIR/threshold_aggregation/"
cp build/threshold_aggregation/verification_key.json "$FRONTEND_DIR/threshold_aggregation/"

echo ""
echo "✅ 所有电路文件已复制到前端！"
echo ""
echo "📊 文件大小统计："
du -sh "$FRONTEND_DIR"/*

echo ""
echo "💡 下一步："
echo "   1. 检查前端 public/circuits 目录"
echo "   2. 运行 'cd ../scripts && npm run register-circuits' 注册电路到链上"
echo "   3. 启动前端测试批次计算功能"
