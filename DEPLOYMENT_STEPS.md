# 🚀 批次电路部署步骤

## ✅ 已完成

- [x] 所有电路编译成功
- [x] Powers of Tau 生成完成
- [x] zkey 文件生成完成

---

## 📋 接下来的步骤

### **步骤 1：复制电路文件到前端**

```bash
cd circuits
bash copy_to_frontend.sh
```

**预期结果**：
```
✅ 所有电路文件已复制到前端！
📊 文件大小统计：
  - frontend/public/circuits/average/
  - frontend/public/circuits/threshold/
  - frontend/public/circuits/batch_average/
  - frontend/public/circuits/aggregation/
  - frontend/public/circuits/batch_threshold/
  - frontend/public/circuits/threshold_aggregation/
```

---

### **步骤 2：注册电路到链上**

```bash
cd scripts
npm install  # 如果还没安装依赖

# 设置你的私钥
export PRIVATE_KEY=suiprivkey1...

# 注册批次电路
npx ts-node register-batch-circuits.ts
```

**预期输出**：
```
🔑 注册电路: Batch Average (100 data points)
   ✅ 交易成功!
   🎯 VK Object ID: 0x...
   💾 请保存此 ID，前端需要使用！

🔑 注册电路: Aggregation (up to 100 batches)
   ✅ 交易成功!
   🎯 VK Object ID: 0x...
   💾 请保存此 ID，前端需要使用！

... (其他电路)
```

**⚠️ 重要**：请记录所有返回的 VK Object IDs！

---

### **步骤 3：更新前端配置**

创建或更新 `frontend/.env.local`：

```bash
# 现有配置
NEXT_PUBLIC_PACKAGE_ID=0xc06de3e29a173a088c5b5f75632e2ef67e9ab1d09e65336589a514d79f1b010d
NEXT_PUBLIC_DATA_REGISTRY_ID=0x77719a8321b655e54aca1ca819c726647109640ea3e7200deadf1b8544d24137
NEXT_PUBLIC_MARKETPLACE_ID=0x402c64be994b79de4f565e5d6463191df801535eea82d32e1da67ffa65b37d67
NEXT_PUBLIC_ZKP_REGISTRY_ID=0x2a5e682613f69ffec125e7accf407abdc11b8289f4d298c019b595466ab698cb
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space

# 新增：批次电路 VK IDs（从步骤2获取）
NEXT_PUBLIC_BATCH_AVERAGE_VK_ID=0x...  # 替换为实际 ID
NEXT_PUBLIC_AGGREGATION_VK_ID=0x...    # 替换为实际 ID
NEXT_PUBLIC_BATCH_THRESHOLD_VK_ID=0x... # 替换为实际 ID
NEXT_PUBLIC_THRESHOLD_AGGREGATION_VK_ID=0x... # 替换为实际 ID
```

---

### **步骤 4：测试前端**

```bash
cd frontend
npm run dev
```

访问 `http://localhost:3000`，测试批次计算功能。

---

## 🧪 测试清单

### **基础测试**

- [ ] 前端能正常启动
- [ ] 电路文件能正常加载（检查浏览器控制台）
- [ ] 旧版电路（average, threshold）仍然正常工作

### **批次计算测试**

- [ ] 上传包含 100+ 数据的 CSV 文件
- [ ] 选择批次计算模式
- [ ] 观察批次处理进度
- [ ] 查看聚合结果
- [ ] 验证链上证明

---

## 📊 电路对比

| 电路 | 数据量 | 约束数 | 证明时间 | 适用场景 |
|------|--------|--------|----------|----------|
| **average** | 3 | ~800 | 1-2秒 | 快速测试 |
| **threshold** | 10 | ~1,800 | 2-3秒 | 小数据集 |
| **batch_average** | 100 | ~23,000 | 10-15秒 | 单批次 |
| **aggregation** | 100批次 | ~21,000 | 10-15秒 | 聚合阶段 |
| **batch_threshold** | 100 | ~24,000 | 10-15秒 | 单批次阈值 |
| **threshold_aggregation** | 100批次 | ~20,500 | 10-15秒 | 阈值聚合 |

---

## 🐛 常见问题

### **问题 1：电路文件加载失败**

**症状**：浏览器控制台显示 404 错误

**解决**：
```bash
# 检查文件是否存在
ls -la frontend/public/circuits/batch_average/

# 重新复制
cd circuits
bash copy_to_frontend.sh
```

### **问题 2：VK 注册失败**

**症状**：`register-batch-circuits.ts` 报错

**解决**：
1. 检查私钥是否正确
2. 检查账户余额（需要 SUI 支付 gas）
3. 检查 Package ID 和 ZKP Registry ID 是否正确

### **问题 3：证明生成太慢**

**症状**：批次证明生成超过 30 秒

**解决**：
- 这是正常的，大电路需要更多时间
- 可以减少批次大小（修改 `DEFAULT_BATCH_CONFIG`）
- 考虑使用 Web Worker 并行处理

---

## 📚 相关文档

- [批次计算使用指南](./BATCH_COMPUTATION_GUIDE.md)
- [项目 README](./README.md)
- [Demo 脚本](./DEMO_SCRIPT_CN.md)

---

## 🎯 下一步优化

1. **性能优化**
   - 实现 Web Worker 并行处理
   - 添加证明缓存机制
   - 优化电路约束数量

2. **用户体验**
   - 添加批次结果可视化
   - 实现进度保存和恢复
   - 提供详细的错误提示

3. **功能扩展**
   - 支持更多统计函数（方差、中位数等）
   - 支持自定义批次大小
   - 支持增量计算

---

**🎉 祝部署顺利！如有问题，请查看文档或联系开发团队。**
