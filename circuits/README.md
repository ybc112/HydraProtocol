# Circom ZKP 电路

本目录包含 HydraProtocol 的零知识证明电路实现。

## 📁 目录结构

```
circuits/
├── src/
│   ├── average.circom       # 平均值计算电路
│   └── threshold.circom     # 阈值查询电路
├── build/                   # 编译输出（git ignored）
│   ├── average/
│   │   ├── average.wasm
│   │   ├── circuit_final.zkey
│   │   └── verification_key.json
│   └── threshold/
│       ├── threshold.wasm
│       ├── circuit_final.zkey
│       └── verification_key.json
├── build_circuits.sh        # 编译脚本
└── README.md               # 本文件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装Circom编译器
npm install -g circom

# 安装SnarkJS（用于生成和验证证明）
npm install -g snarkjs
```

### 2. 编译电路

```bash
cd circuits
./build_circuits.sh
```

编译过程需要约5-10分钟，完成后会生成：
- `.wasm` 文件：用于计算witness
- `.zkey` 文件：用于生成proof
- `verification_key.json`：用于验证proof

### 3. 测试电路

```bash
# 进入TypeScript SDK目录
cd ../sdk/typescript

# 运行测试
npm test
```

## 📋 电路说明

### Average Circuit（平均值计算）

**功能**：计算多个加密数据的平均值，保护原始数据隐私

**输入**：
- `data[3]`: 3个数据值（私有）
- `masks[3]`: 3个随机掩码（私有）

**输出**：
- `average`: 平均值（公开）
- `commitment`: 数据承诺（公开）

**约束**：
- 每个数据值必须 < 2^32
- 平均值计算正确性验证
- 数据承诺正确性验证

**示例数据**：
```json
{
  "data": [100, 200, 300],
  "masks": [12345, 67890, 11111]
}
```

**预期输出**：
```json
{
  "average": 200,
  "commitment": "0x..."
}
```

### Threshold Query Circuit（阈值查询）

**功能**：统计大于某阈值的数据数量，不泄露具体数值

**输入**：
- `data[10]`: 10个数据值（私有）
- `threshold`: 阈值（公开）
- `salt`: 随机盐值（私有）

**输出**：
- `count`: 满足条件的数量（公开）
- `commitment`: 数据承诺（公开）

**示例数据**：
```json
{
  "data": [50, 120, 80, 200, 90, 150, 70, 180, 110, 95],
  "threshold": 100,
  "salt": 123456789
}
```

**预期输出**：
```json
{
  "count": 5,
  "commitment": "0x..."
}
```

## 🔧 手动使用电路

### 1. 创建输入文件

```json
// input.json
{
  "data": [100, 200, 300],
  "masks": [12345, 67890, 11111]
}
```

### 2. 计算witness

```bash
node build/average/average_js/generate_witness.js \
  build/average/average_js/average.wasm \
  input.json \
  witness.wtns
```

### 3. 生成proof

```bash
snarkjs groth16 prove \
  build/average/circuit_final.zkey \
  witness.wtns \
  proof.json \
  public.json
```

### 4. 验证proof

```bash
snarkjs groth16 verify \
  build/average/verification_key.json \
  public.json \
  proof.json
```

## 📊 电路性能

| 电路 | 约束数量 | Witness生成 | Proof生成 | Proof大小 |
|------|---------|-----------|----------|----------|
| Average | ~300 | <100ms | ~2s | 128 bytes |
| Threshold | ~500 | <150ms | ~3s | 128 bytes |

## 🔐 安全说明

### 使用的密码学原语

1. **Poseidon Hash**
   - 用于计算数据承诺
   - ZK-friendly哈希函数
   - 约束效率高

2. **Groth16**
   - 证明系统
   - 证明大小恒定（128字节）
   - 验证速度快（<5ms）

### 安全假设

1. **Setup安全性**
   - Trusted setup使用随机熵
   - Powers of Tau ceremony
   - 生产环境需要MPC ceremony

2. **隐私保证**
   - 原始数据不泄露
   - 只公开计算结果
   - 承诺保证数据完整性

## 🛠️ 开发指南

### 添加新电路

1. 在`src/`目录创建新的`.circom`文件
2. 实现电路逻辑
3. 更新`build_circuits.sh`添加编译命令
4. 编写测试用例

### 调试技巧

```bash
# 使用--verbose查看详细日志
circom src/average.circom --verbose

# 检查约束数量
snarkjs r1cs info build/average/average.r1cs

# 导出约束为JSON（用于调试）
snarkjs r1cs export json build/average/average.r1cs average_constraints.json
```

### 优化建议

1. **减少约束数量**
   - 使用位运算代替算术运算
   - 复用中间信号
   - 使用查找表

2. **提升性能**
   - 使用WASM代替JS witness生成
   - 并行计算witness
   - 缓存编译结果

## 📚 参考资源

- [Circom官方文档](https://docs.circom.io/)
- [SnarkJS教程](https://github.com/iden3/snarkjs)
- [ZK Learning Resources](https://zkp.science/)
- [Poseidon Hash论文](https://eprint.iacr.org/2019/458)

## 🐛 常见问题

### Q: 编译失败，提示"circom not found"
A: 确保已全局安装circom：`npm install -g circom`

### Q: Powers of Tau生成很慢
A: 这是正常的，首次运行需要5-10分钟。后续会复用。

### Q: 如何修改电路参数（如数据数量）？
A: 修改`.circom`文件最后一行的`component main`参数，然后重新编译。

### Q: 证明生成失败
A: 检查输入数据格式是否正确，确保所有字段都存在。

## 📞 支持

遇到问题？查看：
- [Issue Tracker](https://github.com/your-repo/issues)
- [Discord社区](https://discord.gg/hydra)
