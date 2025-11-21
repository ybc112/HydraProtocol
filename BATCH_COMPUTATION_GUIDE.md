# 📊 批次计算功能使用指南

## 🎯 概述

HydraProtocol 现已支持**分批聚合计算**，可以处理大规模数据集（最多 10,000 个数据点），同时保持隐私和性能。

---

## ✨ 核心优势

### **1. 支持大数据集**
- ✅ 旧版：最多 3-10 个数据点
- ✅ 新版：最多 10,000 个数据点（100 批次 × 100 个/批）
- ✅ 理论上可通过调整参数支持更多

### **2. 保证统计精度**
- ✅ 使用全量数据，不是采样
- ✅ 加权平均算法确保精度
- ✅ 每个批次独立验证

### **3. 用户体验优化**
- ✅ 实时进度条
- ✅ 剩余时间估算
- ✅ 可中断和恢复
- ✅ 批次结果可视化

---

## 🏗️ 架构设计

```
用户数据 (10,000 个)
     ↓
分批处理 (100 批次 × 100 个/批)
     ↓
并行生成 ZKP 证明
     ↓
聚合所有批次结果
     ↓
最终验证和提交
```

---

## 📦 新增文件

### **电路文件**
```
circuits/src/
├── batch_average.circom          # 批次平均值电路
├── aggregation.circom            # 平均值聚合电路
├── batch_threshold.circom        # 批次阈值查询电路
└── threshold_aggregation.circom  # 阈值聚合电路
```

### **前端工具**
```
frontend/src/
├── utils/
│   └── batch-processor.ts        # 批次处理工具函数
├── hooks/
│   └── useBatchComputation.ts    # 批次计算 Hook
└── utils/
    └── zkp-browser.ts            # 更新：添加批次证明函数
```

---

## 🚀 快速开始

### **步骤 1：编译电路**

```bash
cd circuits
npm install
bash build_circuits.sh
```

**注意**：编译时间较长（约 10-30 分钟），请耐心等待。

### **步骤 2：复制电路文件到前端**

```bash
# 复制旧版电路（保持兼容）
cp build/average/average.wasm ../frontend/public/circuits/average/
cp build/average/circuit_final.zkey ../frontend/public/circuits/average/
cp build/average/verification_key.json ../frontend/public/circuits/average/

cp build/threshold/threshold.wasm ../frontend/public/circuits/threshold/
cp build/threshold/circuit_final.zkey ../frontend/public/circuits/threshold/
cp build/threshold/verification_key.json ../frontend/public/circuits/threshold/

# 复制新版批次电路
mkdir -p ../frontend/public/circuits/batch_average
mkdir -p ../frontend/public/circuits/aggregation
mkdir -p ../frontend/public/circuits/batch_threshold
mkdir -p ../frontend/public/circuits/threshold_aggregation

cp build/batch_average/* ../frontend/public/circuits/batch_average/
cp build/aggregation/* ../frontend/public/circuits/aggregation/
cp build/batch_threshold/* ../frontend/public/circuits/batch_threshold/
cp build/threshold_aggregation/* ../frontend/public/circuits/threshold_aggregation/
```

### **步骤 3：注册新电路到链上**

```bash
cd ../scripts
npm install

# 设置环境变量
export PRIVATE_KEY=suiprivkey1...  # 你的 Sui 私钥

# 注册电路
npm run register-circuits
```

**记录返回的 VK Object IDs**：
- `batch_average_vk_id`
- `aggregation_vk_id`
- `batch_threshold_vk_id`
- `threshold_aggregation_vk_id`

---

## 💻 使用示例

### **示例 1：前端使用批次计算 Hook**

```typescript
import { useBatchComputation } from '@/hooks/useBatchComputation';

export function MyComputePage() {
  const {
    computeBatch,
    abortComputation,
    isProcessing,
    progress,
    currentBatch,
    totalBatches,
    statusMessage,
    batchResults,
    error
  } = useBatchComputation();

  const handleCompute = async () => {
    try {
      // 准备数据（1000 个数据点）
      const data = Array.from({ length: 1000 }, (_, i) => i + 20);
      
      // 执行批次计算
      const result = await computeBatch({
        circuitType: 'average',
        data,
        onProgress: (progress, message) => {
          console.log(`进度: ${progress}% - ${message}`);
        },
        onBatchComplete: (batchId, batchResult) => {
          console.log(`批次 ${batchId} 完成`, batchResult);
        }
      });
      
      console.log('最终结果:', result);
      console.log('平均值:', result.finalAverage);
      console.log('总数据量:', result.totalCount);
      
    } catch (err) {
      console.error('计算失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCompute} disabled={isProcessing}>
        {isProcessing ? '计算中...' : '开始计算'}
      </button>
      
      {isProcessing && (
        <div>
          <div>进度: {progress}%</div>
          <div>批次: {currentBatch}/{totalBatches}</div>
          <div>状态: {statusMessage}</div>
          <button onClick={abortComputation}>中止</button>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### **示例 2：直接使用工具函数**

```typescript
import {
  splitIntoBatches,
  recommendBatchConfig,
  prepareAggregationInput
} from '@/utils/batch-processor';
import {
  generateBatchAverageProof,
  generateAggregationProof
} from '@/utils/zkp-browser';

async function manualBatchComputation(data: number[]) {
  // 1. 推荐批次配置
  const config = recommendBatchConfig(data.length);
  console.log('推荐配置:', config);
  
  // 2. 分批数据
  const batches = splitIntoBatches(data, config);
  console.log(`数据已分成 ${batches.length} 批`);
  
  // 3. 处理每个批次
  const batchResults = [];
  for (let i = 0; i < batches.length; i++) {
    const { proof, publicSignals } = await generateBatchAverageProof(
      batches[i],
      i
    );
    
    batchResults.push({
      batchId: i,
      average: Number(publicSignals[0]),
      count: Number(publicSignals[1]),
      commitment: publicSignals[2],
      proof,
      publicSignals
    });
  }
  
  // 4. 聚合结果
  const aggregationInput = prepareAggregationInput(batchResults, config.maxBatches);
  const { proof, publicSignals } = await generateAggregationProof(
    aggregationInput.batchAverages,
    aggregationInput.batchCounts,
    aggregationInput.batchCommitments,
    batchResults.length
  );
  
  return {
    finalAverage: Number(publicSignals[0]) / 100,
    totalCount: Number(publicSignals[1]),
    commitment: publicSignals[2],
    proof,
    publicSignals,
    batchResults
  };
}
```

---

## ⚙️ 配置参数

### **BatchConfig**

```typescript
interface BatchConfig {
  batchSize: number;      // 每批数据数量（默认 100）
  maxBatches: number;     // 最大批次数量（默认 100）
  parallelism: number;    // 并行处理批次数（默认 3）
}
```

### **推荐配置表**

| 数据量 | batchSize | maxBatches | parallelism | 预计时间 |
|--------|-----------|------------|-------------|----------|
| < 100 | 100 | 1 | 1 | 5-10 秒 |
| 100-500 | 100 | 5 | 2 | 30-60 秒 |
| 500-2000 | 200 | 10 | 3 | 2-5 分钟 |
| 2000-10000 | 500 | 20 | 4 | 10-20 分钟 |

---

## 📊 性能优化

### **1. 调整批次大小**
```typescript
// 小数据集：使用较小批次
const config = { batchSize: 50, maxBatches: 10, parallelism: 2 };

// 大数据集：使用较大批次
const config = { batchSize: 500, maxBatches: 20, parallelism: 4 };
```

### **2. 使用 Web Worker（未来优化）**
```typescript
// TODO: 实现 Web Worker 并行处理
// 可以同时处理 4 个批次
```

### **3. 进度保存和恢复**
```typescript
import { saveBatchProgress, loadBatchProgress } from '@/utils/batch-processor';

// 保存进度
saveBatchProgress('job123', batchResults, config);

// 恢复进度
const saved = loadBatchProgress('job123');
if (saved) {
  console.log('恢复进度:', saved.batchResults.length, '个批次');
}
```

---

## 🔒 安全性说明

### **1. 隐私保护**
- ✅ 原始数据保持私有（输入为 private signal）
- ✅ 只公开聚合结果和承诺
- ✅ 每个批次独立加密验证

### **2. 完整性验证**
- ✅ 每个批次生成独立 ZKP 证明
- ✅ 聚合证明确保批次间一致性
- ✅ 链上验证最终结果

### **3. 防作弊机制**
- ✅ 承诺值确保数据不可篡改
- ✅ 批次 ID 防止重放攻击
- ✅ ZKP 确保计算正确性

---

## 🐛 故障排除

### **问题 1：编译电路失败**

```bash
# 检查 circom 版本
circom --version  # 应该 >= 2.1.0

# 检查 snarkjs 安装
npm list -g snarkjs
```

### **问题 2：电路文件未找到**

```bash
# 检查文件是否存在
ls frontend/public/circuits/batch_average/batch_average.wasm
ls frontend/public/circuits/aggregation/aggregation.wasm
```

### **问题 3：证明生成太慢**

```typescript
// 减少批次大小
const config = { batchSize: 50, maxBatches: 100, parallelism: 2 };

// 或者使用旧版电路（小数据集）
if (data.length <= 100) {
  // 使用旧版 average.circom
}
```

---

## 📈 路线图

### **Phase 1：基础功能**（已完成）
- ✅ 批次电路实现
- ✅ 聚合电路实现
- ✅ 前端工具和 Hook
- ✅ 使用文档

### **Phase 2：性能优化**（计划中）
- ⏳ Web Worker 并行处理
- ⏳ GPU 加速支持
- ⏳ 增量计算

### **Phase 3：高级功能**（未来）
- ⏳ 分布式计算
- ⏳ 自定义聚合策略
- ⏳ 可视化分析仪表板

---

## 📚 相关文档

- [Circom 语言文档](https://docs.circom.io/)
- [SnarkJS 使用指南](https://github.com/iden3/snarkjs)
- [HydraProtocol README](./README.md)
- [Demo 脚本](./DEMO_SCRIPT_CN.md)

---

## 💬 支持

如有问题，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 联系开发团队

---

**🎉 享受大数据隐私计算的乐趣！**
