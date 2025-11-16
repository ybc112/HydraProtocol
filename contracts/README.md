# HydraProtocol 智能合约

## 📁 合约结构

```
contracts/
├── Move.toml              # Move包配置文件
├── sources/               # 合约源代码
│   └── data_registry.move # 数据注册合约
└── tests/                 # 测试文件
    └── data_registry_tests.move
```

## 🎯 合约功能

### DataRegistry（数据注册合约）

这是HydraProtocol的核心合约，负责管理所有上传到Walrus的数据元信息和访问权限。

#### 主要功能

1. **数据注册** - `register_data()`
   - 注册新的数据记录
   - 存储Walrus Blob ID和数据哈希
   - 防止重复注册

2. **权限管理**
   - `grant_access()` - 授权访问权限
   - `revoke_access()` - 撤销访问权限
   - `verify_access()` - 验证访问权限

3. **访问控制**
   - `record_access()` - 记录数据访问
   - 支持细粒度权限（read、compute、share）
   - 支持过期时间设置

4. **数据管理**
   - `update_metadata()` - 更新元数据
   - `transfer_ownership()` - 转移所有权
   - 多种查询函数

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装Sui CLI
curl https://sui.io/install.sh | sh

# 验证安装
sui --version
```

### 2. 编译合约

```bash
cd contracts
sui move build
```

### 3. 运行测试

```bash
sui move test
```

预期输出：
```
Running Move unit tests
[ PASS    ] 0xhydra::data_registry_tests::test_register_data
[ PASS    ] 0xhydra::data_registry_tests::test_grant_access
[ PASS    ] 0xhydra::data_registry_tests::test_revoke_access
[ PASS    ] 0xhydra::data_registry_tests::test_update_metadata
[ PASS    ] 0xhydra::data_registry_tests::test_transfer_ownership
[ PASS    ] 0xhydra::data_registry_tests::test_grant_access_not_owner
[ PASS    ] 0xhydra::data_registry_tests::test_record_access
Test result: OK. Total tests: 7; passed: 7; failed: 0
```

### 4. 部署到测试网

```bash
# 切换到测试网
sui client switch --env testnet

# 获取测试币
sui client faucet

# 部署合约
sui client publish --gas-budget 100000000
```

## 📊 数据结构

### DataRecord（数据记录）

```move
struct DataRecord {
    id: UID,
    owner: address,              // 数据所有者
    walrus_blob_id: String,      // Walrus Blob ID
    data_hash: vector<u8>,       // SHA256哈希
    data_size: u64,              // 数据大小
    data_type: String,           // 数据类型
    description: String,         // 描述
    encrypted: bool,             // 是否加密
    is_public: bool,             // 是否公开
    created_at: u64,             // 创建时间
    updated_at: u64,             // 更新时间
    access_count: u64,           // 访问次数
    access_grants: Table<address, ID>, // 授权表
}
```

### AccessGrant（访问授权）

```move
struct AccessGrant {
    id: UID,
    data_record_id: ID,          // 关联的数据记录
    grantee: address,            // 被授权者
    grantor: address,            // 授权者
    permission_type: String,     // 权限类型
    granted_at: u64,             // 授权时间
    expires_at: u64,             // 过期时间（0=永久）
    revoked: bool,               // 是否已撤销
    usage_count: u64,            // 使用次数
    last_used_at: u64,           // 最后使用时间
}
```

## 🔒 权限类型

| 权限类型 | 说明 | 用途 |
|---------|------|------|
| `read` | 读取权限 | 可以下载和查看数据 |
| `compute` | 计算权限 | 可以在数据上执行ZKP计算 |
| `share` | 分享权限 | 可以将权限授予他人 |

## 📝 使用示例

### 示例1：注册数据

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module data_registry \
  --function register_data \
  --args \
    <REGISTRY_ID> \
    "blob_abc123" \
    "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]" \
    1024 \
    "medical" \
    "Patient records" \
    true \
    false \
    <CLOCK_ID> \
  --gas-budget 10000000
```

### 示例2：授权访问

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module data_registry \
  --function grant_access \
  --args \
    <DATA_RECORD_ID> \
    <GRANTEE_ADDRESS> \
    "read" \
    0 \
    <CLOCK_ID> \
  --gas-budget 10000000
```

### 示例3：验证权限（只读）

```move
let has_access = data_registry::verify_access(
    &data_record,
    &access_grant,
    requester_address,
    current_timestamp
);
```

## 🎪 事件系统

合约会触发以下事件，方便链下程序监听：

| 事件 | 触发时机 | 用途 |
|------|---------|------|
| `DataRegistered` | 数据注册成功 | 通知新数据已注册 |
| `AccessGranted` | 授权成功 | 通知权限已授予 |
| `AccessRevoked` | 撤销权限 | 通知权限已撤销 |
| `OwnershipTransferred` | 所有权转移 | 通知所有者变更 |
| `DataDeleted` | 数据删除 | 通知数据已删除 |
| `DataAccessed` | 数据被访问 | 记录访问日志 |

## 🔍 查询函数

```move
// 获取基本信息
get_owner(data_record)
get_blob_id(data_record)
get_data_hash(data_record)
get_data_size(data_record)
get_data_type(data_record)
get_description(data_record)

// 状态查询
is_encrypted(data_record)
is_public(data_record)
has_access_grant(data_record, grantee)

// 统计信息
get_access_count(data_record)
get_created_at(data_record)
get_total_count(registry)
```

## ⚠️ 错误码

| 错误码 | 常量 | 说明 |
|-------|------|------|
| 1 | `ENotOwner` | 不是数据所有者 |
| 2 | `EInvalidBlobId` | 无效的Blob ID |
| 3 | `EInvalidDataHash` | 无效的数据哈希 |
| 4 | `EInvalidDataSize` | 无效的数据大小 |
| 5 | `EInvalidAddress` | 无效的地址 |
| 6 | `EAccessNotFound` | 未找到访问权限 |
| 7 | `EInvalidPermission` | 无效的权限类型 |
| 8 | `EAlreadyRegistered` | 已注册 |
| 9 | `EAccessExpired` | 权限已过期 |

## 🧪 测试覆盖

- ✅ 数据注册流程
- ✅ 授权与权限验证
- ✅ 撤销权限
- ✅ 元数据更新
- ✅ 所有权转移
- ✅ 非owner操作失败
- ✅ 访问记录

测试覆盖率：**>70%**

## 📈 Gas消耗估算

| 操作 | 预估Gas | 说明 |
|------|--------|------|
| `register_data` | ~0.02 SUI | 创建DataRecord对象 |
| `grant_access` | ~0.015 SUI | 创建AccessGrant对象 |
| `revoke_access` | ~0.005 SUI | 修改DataRecord |
| `verify_access` | 0 SUI | 只读操作 |
| `record_access` | ~0.005 SUI | 更新计数器 |

*注：Gas费用会根据网络状况波动*

## 🔐 安全考虑

1. **权限控制**：所有修改操作都检查调用者是否为owner
2. **输入验证**：验证所有用户输入（地址、哈希长度、数据大小）
3. **重复注册防护**：使用全局映射防止同一blob_id被重复注册
4. **过期检查**：verify_access会检查权限是否过期
5. **事件审计**：所有关键操作都触发事件，方便追踪

## 🛠️ 开发建议

### 本地测试

```bash
# 运行特定测试
sui move test test_register_data

# 运行带详细输出的测试
sui move test --verbose

# 检查代码覆盖率
sui move coverage
```

### 调试技巧

1. 使用`sui::test_scenario`模拟多用户交互
2. 使用`#[test_only]`标记测试辅助函数
3. 使用`#[expected_failure]`测试错误情况

### 常见问题

**Q: 如何获取部署后的对象ID？**
A: 部署后会在输出中看到Created Objects，记录DataRegistry的Object ID

**Q: 如何在前端监听事件？**
A: 使用Sui SDK的`subscribeEvent()`函数订阅特定类型的事件

**Q: 能否批量授权？**
A: 当前版本不支持，需要循环调用`grant_access()`

## 📚 相关资源

- [Sui Move文档](https://docs.sui.io/build/move)
- [Sui示例](https://github.com/MystenLabs/sui/tree/main/examples)
- [Move Book](https://move-language.github.io/move/)

## 🤝 贡献

如果发现bug或有改进建议，请提交Issue或PR！

---

**下一步**：进入阶段三，开发ZKP验证器合约 🚀


