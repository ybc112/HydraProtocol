#!/bin/bash

# 注册 Average 和 Threshold 电路的验证密钥到 Sui 链上

# 配置（请替换成你的实际值）
PACKAGE_ID="0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6"
ZKP_REGISTRY_ID="0x7e05c6cb6c0ffa398b8b21ae8ab87b985e17af03895ff48dcf7099be32d26e41"

# 注意：VK_DATA 需要是实际的验证密钥数据（从 Circom 编译生成）
# 这里我们先用模拟数据（128字节）进行注册，仅用于演示
# 生产环境需要使用真实的验证密钥

echo "🔐 开始注册 ZKP 电路验证密钥..."

# 生成模拟的 VK 数据（128字节）
# 实际应该从 circuits/build/average_verification_key.json 提取
MOCK_VK_DATA="["
for i in {0..127}; do
    MOCK_VK_DATA+="$i"
    if [ $i -lt 127 ]; then
        MOCK_VK_DATA+=","
    fi
done
MOCK_VK_DATA+="]"

echo ""
echo "📝 注册 Average 电路..."
sui client call \
  --package $PACKAGE_ID \
  --module zkp_verifier \
  --function register_circuit \
  --args \
    $ZKP_REGISTRY_ID \
    "average" \
    "1" \
    "$MOCK_VK_DATA" \
    "Average calculation circuit for privacy-preserving computation" \
    "0x6" \
  --gas-budget 20000000

echo ""
echo "📝 注册 Threshold 电路..."
sui client call \
  --package $PACKAGE_ID \
  --module zkp_verifier \
  --function register_circuit \
  --args \
    $ZKP_REGISTRY_ID \
    "threshold" \
    "1" \
    "$MOCK_VK_DATA" \
    "Threshold query circuit for privacy-preserving computation" \
    "0x6" \
  --gas-budget 20000000

echo ""
echo "✅ 电路注册完成！"
echo ""
echo "🔍 验证注册结果："
echo "查询 CircuitRegistered 事件："
sui client events --query '{"MoveEventType":"'$PACKAGE_ID'::zkp_verifier::CircuitRegistered"}' --limit 10
