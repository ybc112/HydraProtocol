# 真实数据功能 - 快速测试指令

## ⚡ 5分钟快速测试

### 1. 安装依赖
```bash
cd frontend
npm install
```

### 2. 启动前端
```bash
npm run dev
```

### 3. 浏览器操作
打开 http://localhost:3000

### 4. 上传测试数据
```
1. Connect Wallet (Suiet, Testnet)
2. Marketplace → Upload New Data
3. 选择文件: test-data/patients.csv
4. Category: Healthcare
5. Price: 10 SUI
6. Upload & List Data
7. 等待2笔交易确认 (~30秒)
```

### 5. 测试真实数据计算
```
1. Compute 页面
2. 选择刚上传的数据
3. ✅ 确保勾选"使用真实数据"
4. 选择 Average Calculation
5. Compute with ZKP
6. 查看控制台日志：
   - 📥 Downloading blob...
   - 🔓 Decrypting...
   - 📊 Parsing CSV...
   - ✅ Extracted 20 numbers
7. 查看数据预览显示统计信息
8. 等待证明生成和验证
9. 看到结果！
```

---

## 🔍 验证检查点

### ✅ 上传阶段
- [ ] 文件选择成功
- [ ] 进度条显示 0% → 100%
- [ ] 显示 Blob ID
- [ ] 数据出现在marketplace

### ✅ 计算阶段
- [ ] 可以选择已上传的数据
- [ ] "使用真实数据"复选框勾选
- [ ] 点击Compute后显示数据预览
- [ ] 控制台显示下载和解析日志
- [ ] 证明生成成功
- [ ] 提交到区块链
- [ ] 验证通过

### ✅ 结果验证
- [ ] 显示Average结果
- [ ] 显示Transaction哈希
- [ ] Status显示VERIFIED ✅
- [ ] metadata包含真实数据信息

---

## 🎮 测试模式对比

### 模式1: 真实数据（推荐）
```
✅ 使用真实数据 = ON
→ 从Walrus下载并解析实际文件
→ 控制台显示: "📥 Fetching real data..."
→ 数据预览显示实际统计信息
```

### 模式2: 模拟数据（备用）
```
❌ 使用真实数据 = OFF  
→ 使用随机生成的数字
→ 控制台显示: "🎲 Using mock data..."
→ 数据预览显示: "Using mock data: [45, 23, 78]"
```

---

## 📊 测试数据说明

### patients.csv
```csv
共10行数据:
- 年龄列: 45, 67, 52, 71, 38, 55, 63, 49, 58, 42
- 恢复天数: 12, 18, 15, 22, 9, 14, 19, 11, 16, 13
- 总计20个数字
```

### 期望结果
```
Average电路 (取前3个年龄):
输入: [45, 67, 52]
输出: Average: 54

Threshold电路 (恢复天数 > 15):
输入: [12, 18, 15, 22, 9, 14, 19, 11, 16, 13]
输出: Count: 4 (18, 22, 19, 16)
```

---

## 🐛 故障排查

### 问题: xlsx依赖未安装
```bash
Error: Cannot find module 'xlsx'

解决:
npm install xlsx
```

### 问题: 加密密钥未找到
```
⚠️ No encryption key found for blob

原因: 使用了别人上传的数据
解决: 使用自己上传的数据，或让上传者分享密钥
```

### 问题: 文件解析失败
```
❌ Failed to parse file

检查:
1. 文件格式是否支持 (.xlsx, .csv, .json, .txt)
2. 文件是否包含数字
3. 文件是否损坏
```

### 问题: Walrus下载失败
```
❌ Walrus download failed: 404

原因: Blob已过期或不存在
解决: 重新上传文件
```

---

## 🎯 成功标准

测试成功的标志:
1. ✅ 文件成功上传到Walrus
2. ✅ 控制台显示"✅ Extracted X numbers"
3. ✅ 数据预览显示正确的统计信息
4. ✅ ZKP证明生成成功
5. ✅ 智能合约验证通过
6. ✅ 结果显示并标记为VERIFIED

---

## 📞 支持

如果测试失败:
1. 查看浏览器控制台 (F12)
2. 查看完整日志
3. 检查上述故障排查部分
4. 查阅 REAL_DATA_FEATURE.md 详细文档

---

**祝测试顺利！** 🎉

