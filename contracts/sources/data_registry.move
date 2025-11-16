/// HydraProtocol 数据注册合约
/// 功能：管理Walrus存储数据的元信息和访问权限
module hydra::data_registry {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};

    // ==================== 错误码 ====================
    const ENotOwner: u64 = 1;
    const EInvalidBlobId: u64 = 2;
    const EInvalidDataHash: u64 = 3;
    const EInvalidDataSize: u64 = 4;
    const EInvalidAddress: u64 = 5;
    const EAccessNotFound: u64 = 6;
    const EInvalidPermission: u64 = 7;
    const EAlreadyRegistered: u64 = 8;
    const EAccessExpired: u64 = 9;

    // ==================== 常量 ====================
    const MAX_DATA_SIZE: u64 = 104857600; // 100MB
    const SHA256_HASH_LENGTH: u64 = 32;

    // ==================== 数据结构 ====================

    /// 数据记录对象 - 存储数据的元信息
    public struct DataRecord has key, store {
        id: UID,
        /// 数据所有者
        owner: address,
        /// Walrus Blob ID
        walrus_blob_id: String,
        /// 数据的SHA256哈希（用于完整性验证）
        data_hash: vector<u8>,
        /// 数据大小（字节）
        data_size: u64,
        /// 数据类型（medical, financial, survey等）
        data_type: String,
        /// 描述信息
        description: String,
        encrypted: bool,
        /// 每个购买者的加密密钥
        encryption_keys: Table<address, vector<u8>>,
        /// 是否公开访问
        is_public: bool,
        /// 创建时间戳
        created_at: u64,
        /// 最后更新时间
        updated_at: u64,
        /// 访问次数
        access_count: u64,
        /// 授权列表（address -> AccessGrant ID）
        access_grants: Table<address, ID>,
    }

    /// 访问授权对象
    public struct AccessGrant has key, store {
        id: UID,
        /// 关联的数据记录ID
        data_record_id: ID,
        /// 被授权者地址
        grantee: address,
        /// 授权者地址
        grantor: address,
        /// 权限类型（read, compute, share）
        permission_type: String,
        /// 授权时间
        granted_at: u64,
        /// 过期时间（0表示永久）
        expires_at: u64,
        /// 是否已撤销
        revoked: bool,
        /// 使用次数
        usage_count: u64,
        /// 最后使用时间
        last_used_at: u64,
    }

    /// 全局注册表 - 跟踪所有数据记录
    public struct DataRegistry has key {
        id: UID,
        /// 总数据数量
        total_count: u64,
        /// Blob ID到Data Record ID的映射（防止重复注册）
        blob_id_map: Table<String, ID>,
        /// 用户加密公钥注册表（address -> x25519公钥字节）
        user_keys: Table<address, vector<u8>>,
    }

    // ==================== 事件 ====================

    /// 数据注册事件
    public struct DataRegistered has copy, drop {
        data_id: ID,
        owner: address,
        walrus_blob_id: String,
        data_hash: vector<u8>,
        data_type: String,
        encrypted: bool,
        timestamp: u64,
    }

    /// 访问授权事件
    public struct AccessGranted has copy, drop {
        data_id: ID,
        grantee: address,
        grantor: address,
        permission_type: String,
        expires_at: u64,
        timestamp: u64,
    }

    /// 撤销授权事件
    public struct AccessRevoked has copy, drop {
        data_id: ID,
        grantee: address,
        timestamp: u64,
    }

    /// 加密密钥分发事件（用于买家检索解密密钥密文）
    public struct KeyDistributed has copy, drop {
        data_id: ID,
        buyer: address,
        encrypted_key: vector<u8>,
        timestamp: u64,
    }

    /// 用户加密公钥注册事件
    public struct UserKeyRegistered has copy, drop {
        user: address,
        pubkey: vector<u8>,
        timestamp: u64,
    }

    /// 所有权转移事件
    public struct OwnershipTransferred has copy, drop {
        data_id: ID,
        old_owner: address,
        new_owner: address,
        timestamp: u64,
    }

    /// 数据删除事件
    public struct DataDeleted has copy, drop {
        data_id: ID,
        owner: address,
        timestamp: u64,
    }

    /// 数据访问事件
    public struct DataAccessed has copy, drop {
        data_id: ID,
        accessor: address,
        timestamp: u64,
    }

    // ==================== 初始化 ====================

    /// 模块初始化函数
    fun init(ctx: &mut TxContext) {
        let registry = DataRegistry {
            id: object::new(ctx),
            total_count: 0,
            blob_id_map: table::new(ctx),
            user_keys: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // ==================== 核心功能 ====================

    /// 注册新数据
    public entry fun register_data(
        registry: &mut DataRegistry,
        walrus_blob_id: String,
        data_hash: vector<u8>,
        data_size: u64,
        data_type: String,
        description: String,
        encrypted: bool,
        is_public: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 输入验证
        assert!(string::length(&walrus_blob_id) > 0, EInvalidBlobId);
        assert!(vector::length(&data_hash) == SHA256_HASH_LENGTH, EInvalidDataHash);
        assert!(data_size > 0 && data_size <= MAX_DATA_SIZE, EInvalidDataSize);
        
        // 检查是否重复注册
        assert!(!table::contains(&registry.blob_id_map, walrus_blob_id), EAlreadyRegistered);

        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        // 创建数据记录
        let data_record = DataRecord {
            id: object::new(ctx),
            owner: sender,
            walrus_blob_id,
            data_hash,
            data_size,
            data_type,
            description,
            encrypted,
            encryption_keys: table::new(ctx),
            is_public,
            created_at: timestamp,
            updated_at: timestamp,
            access_count: 0,
            access_grants: table::new(ctx),
        };

        let data_id = object::uid_to_inner(&data_record.id);
        
        // 更新全局注册表
        table::add(&mut registry.blob_id_map, data_record.walrus_blob_id, data_id);
        registry.total_count = registry.total_count + 1;

        // 触发事件
        event::emit(DataRegistered {
            data_id,
            owner: sender,
            walrus_blob_id: data_record.walrus_blob_id,
            data_hash: data_record.data_hash,
            data_type: data_record.data_type,
            encrypted,
            timestamp,
        });

        // 将数据记录转为共享对象（允许他人读取元数据）
        transfer::share_object(data_record);
    }

    /// 授权访问权限
    public entry fun grant_access(
        data_record: &mut DataRecord,
        grantee: address,
        permission_type: String,
        expires_at: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // 权限检查：只有owner可以授权
        assert!(sender == data_record.owner, ENotOwner);
        
        // 输入验证
        assert!(grantee != @0x0, EInvalidAddress);
        assert!(
            permission_type == string::utf8(b"read") || 
            permission_type == string::utf8(b"compute") || 
            permission_type == string::utf8(b"share"),
            EInvalidPermission
        );

        let timestamp = clock::timestamp_ms(clock);

        // 如果已存在授权，先移除旧的
        if (table::contains(&data_record.access_grants, grantee)) {
            let _old_grant_id = table::remove(&mut data_record.access_grants, grantee);
        };

        // 创建新的授权记录
        let access_grant = AccessGrant {
            id: object::new(ctx),
            data_record_id: object::uid_to_inner(&data_record.id),
            grantee,
            grantor: sender,
            permission_type,
            granted_at: timestamp,
            expires_at,
            revoked: false,
            usage_count: 0,
            last_used_at: 0,
        };

        let grant_id = object::uid_to_inner(&access_grant.id);
        
        // 添加到授权列表
        table::add(&mut data_record.access_grants, grantee, grant_id);
        
        // 更新时间戳
        data_record.updated_at = timestamp;

        // 触发事件
        event::emit(AccessGranted {
            data_id: object::uid_to_inner(&data_record.id),
            grantee,
            grantor: sender,
            permission_type,
            expires_at,
            timestamp,
        });

        // 转为共享对象
        transfer::share_object(access_grant);
    }

    /// 撤销访问权限
    public entry fun revoke_access(
        data_record: &mut DataRecord,
        grantee: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // 权限检查
        assert!(sender == data_record.owner, ENotOwner);
        
        // 检查是否存在授权
        assert!(table::contains(&data_record.access_grants, grantee), EAccessNotFound);

        let _grant_id = table::remove(&mut data_record.access_grants, grantee);
        
        let timestamp = clock::timestamp_ms(clock);
        data_record.updated_at = timestamp;

        // 触发事件
        event::emit(AccessRevoked {
            data_id: object::uid_to_inner(&data_record.id),
            grantee,
            timestamp,
        });
    }

    public entry fun revoke_access_with_object(
        data_record: &mut DataRecord,
        access_grant: &mut AccessGrant,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == data_record.owner, ENotOwner);
        assert!(access_grant.data_record_id == object::uid_to_inner(&data_record.id), EAccessNotFound);
        let grantee = access_grant.grantee;
        if (table::contains(&data_record.access_grants, grantee)) {
            let _ = table::remove(&mut data_record.access_grants, grantee);
        };
        access_grant.revoked = true;
        data_record.updated_at = clock::timestamp_ms(clock);
        event::emit(AccessRevoked {
            data_id: object::uid_to_inner(&data_record.id),
            grantee,
            timestamp: data_record.updated_at,
        });
    }

    /// 验证访问权限（只读函数）
    public fun verify_access(
        data_record: &DataRecord,
        access_grant: &AccessGrant,
        requester: address,
        current_time: u64,
    ): bool {
        // 1. 检查是否是owner
        if (requester == data_record.owner) {
            return true
        };

        // 2. 检查是否公开访问
        if (data_record.is_public) {
            return true
        };

        if (!table::contains(&data_record.access_grants, requester)) {
            return false
        };

        // 3. 验证AccessGrant
        if (access_grant.grantee != requester) {
            return false
        };

        if (access_grant.data_record_id != object::uid_to_inner(&data_record.id)) {
            return false
        };

        if (access_grant.revoked) {
            return false
        };

        // 4. 检查是否过期
        if (access_grant.expires_at != 0 && access_grant.expires_at < current_time) {
            return false
        };

        true
    }

    /// 记录数据访问（增加访问计数）
    public entry fun record_access(
        data_record: &mut DataRecord,
        access_grant: &mut AccessGrant,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 验证权限
        assert!(verify_access(data_record, access_grant, sender, timestamp), ENotOwner);

        // 更新访问计数
        data_record.access_count = data_record.access_count + 1;
        access_grant.usage_count = access_grant.usage_count + 1;
        access_grant.last_used_at = timestamp;

        // 触发事件
        event::emit(DataAccessed {
            data_id: object::uid_to_inner(&data_record.id),
            accessor: sender,
            timestamp,
        });
    }

    /// 更新数据元数据
    public entry fun update_metadata(
        data_record: &mut DataRecord,
        new_description: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == data_record.owner, ENotOwner);

        data_record.description = new_description;
        data_record.updated_at = clock::timestamp_ms(clock);
    }

    /// 转移所有权
    public entry fun transfer_ownership(
        data_record: &mut DataRecord,
        new_owner: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == data_record.owner, ENotOwner);
        assert!(new_owner != @0x0, EInvalidAddress);
        assert!(new_owner != sender, EInvalidAddress);

        let old_owner = data_record.owner;
        data_record.owner = new_owner;
        
        let timestamp = clock::timestamp_ms(clock);
        data_record.updated_at = timestamp;

        event::emit(OwnershipTransferred {
            data_id: object::uid_to_inner(&data_record.id),
            old_owner,
            new_owner,
            timestamp,
        });
    }

    // ==================== 查询函数 ====================

    /// 获取数据所有者
    public fun get_owner(data_record: &DataRecord): address {
        data_record.owner
    }

    /// 获取Walrus Blob ID
    public fun get_blob_id(data_record: &DataRecord): String {
        data_record.walrus_blob_id
    }

    /// 获取数据哈希
    public fun get_data_hash(data_record: &DataRecord): vector<u8> {
        data_record.data_hash
    }

    /// 获取数据大小
    public fun get_data_size(data_record: &DataRecord): u64 {
        data_record.data_size
    }

    /// 获取数据类型
    public fun get_data_type(data_record: &DataRecord): String {
        data_record.data_type
    }

    /// 获取描述
    public fun get_description(data_record: &DataRecord): String {
        data_record.description
    }

    /// 检查是否加密
    public fun is_encrypted(data_record: &DataRecord): bool {
        data_record.encrypted
    }

    /// 检查是否公开
    public fun is_public(data_record: &DataRecord): bool {
        data_record.is_public
    }

    /// 获取创建时间
    public fun get_created_at(data_record: &DataRecord): u64 {
        data_record.created_at
    }

    /// 获取访问次数
    public fun get_access_count(data_record: &DataRecord): u64 {
        data_record.access_count
    }

    /// 获取注册表总数据数
    public fun get_total_count(registry: &DataRegistry): u64 {
        registry.total_count
    }

    public fun register_user_pubkey(
        registry: &mut DataRegistry,
        pubkey: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        if (table::contains(&registry.user_keys, sender)) {
            let _ = table::remove(&mut registry.user_keys, sender);
        };
        table::add(&mut registry.user_keys, sender, pubkey);
        event::emit(UserKeyRegistered { user: sender, pubkey, timestamp: 0 });
    }

    public fun get_user_pubkey(registry: &DataRegistry, user: address): &vector<u8> {
        table::borrow(&registry.user_keys, user)
    }

    /// 检查是否有授权
    public fun has_access_grant(data_record: &DataRecord, grantee: address): bool {
        table::contains(&data_record.access_grants, grantee)
    }

    public fun set_encrypted_key(
        data_record: &mut DataRecord,
        buyer: address,
        encrypted_key: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == data_record.owner, ENotOwner);
        if (table::contains(&data_record.encryption_keys, buyer)) {
            let _ = table::remove(&mut data_record.encryption_keys, buyer);
        };
        table::add(&mut data_record.encryption_keys, buyer, encrypted_key);

        event::emit(KeyDistributed {
            data_id: object::uid_to_inner(&data_record.id),
            buyer,
            encrypted_key,
            timestamp: data_record.updated_at,
        });
    }

    public fun get_encrypted_key_for(data_record: &DataRecord, requester: address): &vector<u8> {
        table::borrow(&data_record.encryption_keys, requester)
    }

    public fun has_encrypted_key_for(data_record: &DataRecord, requester: address): bool {
        table::contains(&data_record.encryption_keys, requester)
    }

    // ==================== 测试辅助函数 ====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}


