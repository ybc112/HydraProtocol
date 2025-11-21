# 批次电路 Verification Key Object IDs

**注册时间**: 2025-11-20
**网络**: Sui Testnet
**发送者**: 0xd9a8a7a0295fa736aa638f6a29086a532d86043e9284c06c1e5d031739372407

---

## VK Object IDs

### 1. Batch Average (100 data points)
- **电路名称**: `batch_average`
- **VK Object ID**: `0x120f14e9d4ce8ef4b35d1ed9e7fab712771256392edcbd38338dd6923536c305`
- **交易 Digest**: `9Mzstkz9M5wQXRpM1V2MuFdJXdN6uB9VYJxAFoHwnHwz`
- **用途**: 单批次平均值计算（100个数据点）

### 2. Aggregation (up to 100 batches)
- **电路名称**: `aggregation`
- **VK Object ID**: `0x53d6d732d19595049ae83438548bc4e37e9af6706c18b151e49de5743296f3a9`
- **交易 Digest**: `8wgSfeUKFsPmSVgUDSoZaSXTLn2erhmUQycUz13cRgNA`
- **用途**: 聚合多个批次结果（最多100批次）

### 3. Batch Threshold (100 data points)
- **电路名称**: `batch_threshold`
- **VK Object ID**: `0xd79a9745a11f9c7a16c26b5dfa5c58dab0cdbd90de4afae278a552bdbdc173e7`
- **交易 Digest**: `86U8Nxt6xsPF9UFp7fryXytbZaHciSM6DFtbzsB7jhdr`
- **用途**: 单批次阈值查询（100个数据点）

### 4. Threshold Aggregation (up to 100 batches)
- **电路名称**: `threshold_aggregation`
- **VK Object ID**: `0x9bacd83751b17b87c40e704edd34d7cec44f06b4cd6c74e6a31118400e2b1364`
- **交易 Digest**: `4tDjPkD2Xy9xfoYWKEQPjwX5Qc57Gh6o9mgh186XhCSB`
- **用途**: 聚合多个批次的阈值查询结果（最多100批次）

---

## 前端环境变量配置

将以下内容添加到 `frontend/.env.local`：

```bash
# 批次电路 VK IDs
NEXT_PUBLIC_BATCH_AVERAGE_VK_ID=0x120f14e9d4ce8ef4b35d1ed9e7fab712771256392edcbd38338dd6923536c305
NEXT_PUBLIC_AGGREGATION_VK_ID=0x53d6d732d19595049ae83438548bc4e37e9af6706c18b151e49de5743296f3a9
NEXT_PUBLIC_BATCH_THRESHOLD_VK_ID=0xd79a9745a11f9c7a16c26b5dfa5c58dab0cdbd90de4afae278a552bdbdc173e7
NEXT_PUBLIC_THRESHOLD_AGGREGATION_VK_ID=0x9bacd83751b17b87c40e704edd34d7cec44f06b4cd6c74e6a31118400e2b1364
```

---

## 验证链接

- [Batch Average VK](https://suiscan.xyz/testnet/object/0x120f14e9d4ce8ef4b35d1ed9e7fab712771256392edcbd38338dd6923536c305)
- [Aggregation VK](https://suiscan.xyz/testnet/object/0x53d6d732d19595049ae83438548bc4e37e9af6706c18b151e49de5743296f3a9)
- [Batch Threshold VK](https://suiscan.xyz/testnet/object/0xd79a9745a11f9c7a16c26b5dfa5c58dab0cdbd90de4afae278a552bdbdc173e7)
- [Threshold Aggregation VK](https://suiscan.xyz/testnet/object/0x9bacd83751b17b87c40e704edd34d7cec44f06b4cd6c74e6a31118400e2b1364)

---

## 使用说明

这些 VK Object IDs 用于链上验证批次计算的 ZKP 证明。前端在提交证明时需要引用对应的 VK ID。

**重要**：请妥善保管此文件，这些 ID 是批次计算功能的关键配置。
