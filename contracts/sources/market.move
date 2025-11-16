/// HydraProtocol 数据市场合约
/// 功能：管理数据定价、交易、质押和奖励分配
module hydra::market {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use hydra::data_registry::{DataRecord};

    // ==================== 错误码 ====================
    const ENotOwner: u64 = 1;
    const EInsufficientBalance: u64 = 2;
    const EInvalidPrice: u64 = 3;
    const EInvalidStakeAmount: u64 = 4;
    const EListingNotFound: u64 = 5;
    const EListingNotActive: u64 = 6;
    const EAlreadyPurchased: u64 = 7;
    const EStakeNotFound: u64 = 8;
    const EStakeLocked: u64 = 9;
    const EInvalidRewardAmount: u64 = 10;
    const EUnauthorizedWithdraw: u64 = 11;
    const ENotAdmin: u64 = 12;

    // ==================== 常量 ====================
    const MIN_STAKE_AMOUNT: u64 = 1000000000; // 1 SUI
    const MIN_LISTING_PRICE: u64 = 100000000; // 0.1 SUI
    const PLATFORM_FEE_RATE: u64 = 250; // 2.5% (basis points: 250/10000)
    const VERIFIER_REWARD_RATE: u64 = 500; // 5% (basis points: 500/10000)
    const STAKE_LOCK_PERIOD: u64 = 86400000; // 24小时（毫秒）

    // ==================== 数据结构 ====================

    /// 数据挂牌出售
    public struct DataListing has key, store {
        id: UID,
        /// 关联的数据记录ID
        data_record_id: ID,
        /// 数据所有者
        owner: address,
        /// 访问价格（SUI）
        price: u64,
        /// 数据类型
        data_type: String,
        /// 描述
        description: String,
        /// 是否激活
        active: bool,
        /// 总销售次数
        total_sales: u64,
        /// 总收益
        total_revenue: u64,
        /// 已购买用户列表
        purchasers: Table<address, bool>,
        /// 创建时间
        created_at: u64,
        /// 更新时间
        updated_at: u64,
    }

    /// 质押记录
    public struct StakeRecord has key, store {
        id: UID,
        /// 质押者地址
        staker: address,
        /// 质押金额
        amount: u64,
        /// 质押类型（provider, verifier）
        stake_type: String,
        /// 关联的数据或任务ID（可选）
        associated_id: ID,
        /// 质押时间
        staked_at: u64,
        /// 解锁时间
        unlock_at: u64,
        /// 是否已解锁
        unlocked: bool,
        /// 累计奖励
        rewards_earned: u64,
    }

    /// 购买记录
    public struct Purchase has key, store {
        id: UID,
        /// 购买者地址
        buyer: address,
        /// 数据挂牌ID
        listing_id: ID,
        /// 数据记录ID（用于查询原始数据）
            data_record_id: ID,
            /// 支付金额
            amount: u64,
        /// 购买时间
        purchased_at: u64,
        /// 访问过期时间（0表示永久）
        expires_at: u64,
    }

    /// 市场全局状态
    public struct Marketplace has key {
        id: UID,
        /// 平台管理员地址
        admin: address,
        /// 平台总交易额
        total_volume: u64,
        /// 活跃挂牌数量
        active_listings: u64,
        /// 总质押金额
        total_staked: u64,
        /// 平台费用余额
        platform_balance: Balance<SUI>,
        /// 奖励池余额
        reward_pool: Balance<SUI>,
        /// 挂牌列表映射（data_record_id -> listing_id）
        listings: Table<ID, ID>,
    }

    // ==================== 事件 ====================

    /// 数据挂牌事件
    public struct DataListed has copy, drop {
        listing_id: ID,
        data_record_id: ID,
        owner: address,
        price: u64,
        timestamp: u64,
    }

    /// 数据购买事件
    public struct DataPurchased has copy, drop {
        purchase_id: ID,
        listing_id: ID,
        buyer: address,
        amount: u64,
        timestamp: u64,
    }

    /// 质押事件
    public struct Staked has copy, drop {
        stake_id: ID,
        staker: address,
        amount: u64,
        stake_type: String,
        timestamp: u64,
    }

    /// 解押事件
    public struct Unstaked has copy, drop {
        stake_id: ID,
        staker: address,
        amount: u64,
        rewards: u64,
        timestamp: u64,
    }

    /// 奖励分配事件
    public struct RewardDistributed has copy, drop {
        recipient: address,
        amount: u64,
        reason: String,
        timestamp: u64,
    }

    /// 价格更新事件
    public struct PriceUpdated has copy, drop {
        listing_id: ID,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
    }

    // ==================== 初始化 ====================

    /// 模块初始化函数
    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            total_volume: 0,
            active_listings: 0,
            total_staked: 0,
            platform_balance: balance::zero(),
            reward_pool: balance::zero(),
            listings: table::new(ctx),
        };
        transfer::share_object(marketplace);
    }

    // ==================== 数据市场功能 ====================

    /// 将数据挂牌出售
    public entry fun list_data(
        marketplace: &mut Marketplace,
        data_record_id: ID,
        price: u64,
        data_type: String,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 输入验证
        assert!(price >= MIN_LISTING_PRICE, EInvalidPrice);

        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 创建挂牌对象
        let listing = DataListing {
            id: object::new(ctx),
            data_record_id,
            owner: sender,
            price,
            data_type,
            description,
            active: true,
            total_sales: 0,
            total_revenue: 0,
            purchasers: table::new(ctx),
            created_at: timestamp,
            updated_at: timestamp,
        };

        let listing_id = object::uid_to_inner(&listing.id);

        // 添加到市场映射
        table::add(&mut marketplace.listings, data_record_id, listing_id);
        marketplace.active_listings = marketplace.active_listings + 1;

        // 触发事件
        event::emit(DataListed {
            listing_id,
            data_record_id,
            owner: sender,
            price,
            timestamp,
        });

        // 转为共享对象
        transfer::share_object(listing);
    }

    /// 购买数据访问权限
    public entry fun purchase_data_access(
        marketplace: &mut Marketplace,
        listing: &mut DataListing,
        data_record: &DataRecord,
        payment: Coin<SUI>,
        expires_at: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 安全检查1：验证DataRecord与Listing匹配
        assert!(object::id(data_record) == listing.data_record_id, EListingNotFound);

        // 安全检查2：挂牌是否激活
        assert!(listing.active, EListingNotActive);

        // 安全检查3：防止自己购买自己的数据
        assert!(sender != listing.owner, ENotOwner);

        // 安全检查4：检查是否已购买
        assert!(!table::contains(&listing.purchasers, sender), EAlreadyPurchased);

        // 安全检查5：检查支付金额
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= listing.price, EInsufficientBalance);

        // 计算费用分配
        let platform_fee = (listing.price * PLATFORM_FEE_RATE) / 10000;
        let verifier_reward = (listing.price * VERIFIER_REWARD_RATE) / 10000;
        let owner_revenue = listing.price - platform_fee - verifier_reward;

        // 分配费用
        let mut payment_balance = coin::into_balance(payment);

        // 平台费用
        let platform_coin = balance::split(&mut payment_balance, platform_fee);
        balance::join(&mut marketplace.platform_balance, platform_coin);

        // 验证者奖励池
        let reward_coin = balance::split(&mut payment_balance, verifier_reward);
        balance::join(&mut marketplace.reward_pool, reward_coin);

        // 数据所有者收益
        let owner_coin = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(owner_coin, listing.owner);

        // 更新统计信息
        listing.total_sales = listing.total_sales + 1;
        listing.total_revenue = listing.total_revenue + listing.price;
        listing.updated_at = timestamp;
        table::add(&mut listing.purchasers, sender, true);

        marketplace.total_volume = marketplace.total_volume + listing.price;

        // 创建购买记录
        let data_record_id = object::id(data_record);
        
        let purchase = Purchase {
            id: object::new(ctx),
            buyer: sender,
            listing_id: object::uid_to_inner(&listing.id),
            data_record_id,
            amount: listing.price,
            purchased_at: timestamp,
            expires_at,
        };

        let purchase_id = object::uid_to_inner(&purchase.id);

        // 触发事件
        event::emit(DataPurchased {
            purchase_id,
            listing_id: object::uid_to_inner(&listing.id),
            buyer: sender,
            amount: listing.price,
            timestamp,
        });

        // 转移购买记录给买家
        transfer::transfer(purchase, sender);
    }

    /// 为买家分发加密密钥（验证已购买）
    public entry fun distribute_key_to_buyer(
        listing: &DataListing,
        data_record: &mut DataRecord,
        buyer: address,
        encrypted_key: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        // 仅所有者可分发
        assert!(sender == hydra::data_registry::get_owner(data_record), ENotOwner);
        // 验证数据记录与挂牌匹配
        assert!(object::id(data_record) == listing.data_record_id, EListingNotFound);
        // 验证买家已购买
        assert!(table::contains(&listing.purchasers, buyer), EAlreadyPurchased);
        // 分发密钥（写入并事件在data_registry中触发）
        hydra::data_registry::set_encrypted_key(data_record, buyer, encrypted_key, ctx);
    }

    /// 更新挂牌价格
    public entry fun update_listing_price(
        listing: &mut DataListing,
        new_price: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == listing.owner, ENotOwner);
        assert!(new_price >= MIN_LISTING_PRICE, EInvalidPrice);

        let old_price = listing.price;
        listing.price = new_price;
        listing.updated_at = clock::timestamp_ms(clock);

        event::emit(PriceUpdated {
            listing_id: object::uid_to_inner(&listing.id),
            old_price,
            new_price,
            timestamp: listing.updated_at,
        });
    }

    /// 下架数据
    public entry fun delist_data(
        marketplace: &mut Marketplace,
        listing: &mut DataListing,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == listing.owner, ENotOwner);

        listing.active = false;
        marketplace.active_listings = marketplace.active_listings - 1;
    }

    // ==================== 质押功能 ====================

    /// 质押代币
    public entry fun stake(
        marketplace: &mut Marketplace,
        stake_amount: Coin<SUI>,
        stake_type: String,
        associated_id: ID,
        lock_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&stake_amount);
        assert!(amount >= MIN_STAKE_AMOUNT, EInvalidStakeAmount);

        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        let unlock_at = timestamp + lock_duration;

        // 创建质押记录
        let stake_record = StakeRecord {
            id: object::new(ctx),
            staker: sender,
            amount,
            stake_type,
            associated_id,
            staked_at: timestamp,
            unlock_at,
            unlocked: false,
            rewards_earned: 0,
        };

        let stake_id = object::uid_to_inner(&stake_record.id);

        // 将质押代币加入市场
        let stake_balance = coin::into_balance(stake_amount);
        balance::join(&mut marketplace.reward_pool, stake_balance);
        marketplace.total_staked = marketplace.total_staked + amount;

        // 触发事件
        event::emit(Staked {
            stake_id,
            staker: sender,
            amount,
            stake_type,
            timestamp,
        });

        // 转移质押记录给质押者
        transfer::transfer(stake_record, sender);
    }

    /// 解除质押
    public entry fun unstake(
        marketplace: &mut Marketplace,
        stake_record: StakeRecord,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 权限检查
        assert!(sender == stake_record.staker, ENotOwner);

        // 检查是否已解锁
        assert!(!stake_record.unlocked, EStakeLocked);

        // 检查锁定期
        assert!(timestamp >= stake_record.unlock_at, EStakeLocked);

        // 提取质押金额
        let stake_amount = balance::split(&mut marketplace.reward_pool, stake_record.amount);
        let stake_coin = coin::from_balance(stake_amount, ctx);

        // 计算奖励（简化版：基于质押时长，防止溢出）
        // 年化1%收益率 = amount * duration / year_ms
        let stake_duration = timestamp - stake_record.staked_at;
        let year_in_ms: u64 = 365 * 24 * 3600 * 1000;
        // 先除后乘，避免 amount * duration 溢出
        let reward_amount = if (stake_duration >= year_in_ms) {
            // 超过一年，按整年计算
            (stake_duration / year_in_ms) * (stake_record.amount / 100)
        } else {
            // 不足一年，按比例计算
            (stake_record.amount / 100) * stake_duration / year_in_ms
        };

        let rewards = if (balance::value(&marketplace.reward_pool) >= reward_amount) {
            let reward_balance = balance::split(&mut marketplace.reward_pool, reward_amount);
            coin::from_balance(reward_balance, ctx)
        } else {
            coin::zero(ctx)
        };

        let total_rewards = coin::value(&rewards);

        // 更新统计
        marketplace.total_staked = marketplace.total_staked - stake_record.amount;

        // 触发事件
        event::emit(Unstaked {
            stake_id: object::uid_to_inner(&stake_record.id),
            staker: sender,
            amount: stake_record.amount,
            rewards: total_rewards,
            timestamp,
        });

        // 转账
        transfer::public_transfer(stake_coin, sender);
        transfer::public_transfer(rewards, sender);

        // 销毁质押记录
        let StakeRecord { id, staker: _, amount: _, stake_type: _, associated_id: _,
                          staked_at: _, unlock_at: _, unlocked: _, rewards_earned: _ } = stake_record;
        object::delete(id);
    }

    // ==================== 奖励分配 ====================

    /// 分配验证者奖励（仅管理员）
    public entry fun distribute_verifier_reward(
        marketplace: &mut Marketplace,
        verifier: address,
        reward_amount: u64,
        reason: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 权限检查：只有管理员可以分配奖励
        let sender = tx_context::sender(ctx);
        assert!(sender == marketplace.admin, ENotAdmin);

        // 检查奖励池余额
        assert!(balance::value(&marketplace.reward_pool) >= reward_amount, EInsufficientBalance);

        // 提取奖励
        let reward_balance = balance::split(&mut marketplace.reward_pool, reward_amount);
        let reward_coin = coin::from_balance(reward_balance, ctx);

        let timestamp = clock::timestamp_ms(clock);

        // 触发事件
        event::emit(RewardDistributed {
            recipient: verifier,
            amount: reward_amount,
            reason,
            timestamp,
        });

        // 转账给验证者
        transfer::public_transfer(reward_coin, verifier);
    }

    /// 平台费用提现（仅管理员）
    public entry fun withdraw_platform_fees(
        marketplace: &mut Marketplace,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // 权限检查：只有管理员可以提取平台费用
        let sender = tx_context::sender(ctx);
        assert!(sender == marketplace.admin, ENotAdmin);

        assert!(balance::value(&marketplace.platform_balance) >= amount, EInsufficientBalance);

        let withdrawal = balance::split(&mut marketplace.platform_balance, amount);
        let coin_out = coin::from_balance(withdrawal, ctx);

        transfer::public_transfer(coin_out, recipient);
    }

    // ==================== 查询函数 ====================

    /// 获取挂牌信息
    public fun get_listing_price(listing: &DataListing): u64 {
        listing.price
    }

    public fun get_listing_owner(listing: &DataListing): address {
        listing.owner
    }

    public fun is_listing_active(listing: &DataListing): bool {
        listing.active
    }

    public fun get_total_sales(listing: &DataListing): u64 {
        listing.total_sales
    }

    public fun has_purchased(listing: &DataListing, buyer: address): bool {
        table::contains(&listing.purchasers, buyer)
    }

    /// 获取质押信息
    public fun get_stake_amount(stake: &StakeRecord): u64 {
        stake.amount
    }

    public fun get_stake_unlock_time(stake: &StakeRecord): u64 {
        stake.unlock_at
    }

    public fun is_stake_unlocked(stake: &StakeRecord): bool {
        stake.unlocked
    }

    /// 获取市场统计
    public fun get_total_volume(marketplace: &Marketplace): u64 {
        marketplace.total_volume
    }

    public fun get_active_listings_count(marketplace: &Marketplace): u64 {
        marketplace.active_listings
    }

    public fun get_total_staked(marketplace: &Marketplace): u64 {
        marketplace.total_staked
    }

    public fun get_platform_balance(marketplace: &Marketplace): u64 {
        balance::value(&marketplace.platform_balance)
    }

    public fun get_reward_pool_balance(marketplace: &Marketplace): u64 {
        balance::value(&marketplace.reward_pool)
    }

    // ==================== 测试辅助函数 ====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
