#[test_only]
module hydra::market_tests {
    use hydra::market::{Self, DataListing, StakeRecord, Purchase, Marketplace};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use sui::object::{Self, ID};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;

    // 测试地址
    const ADMIN: address = @0xAD;
    const SELLER: address = @0xA;
    const BUYER: address = @0xB;
    const STAKER: address = @0xC;
    const VERIFIER: address = @0xD;

    // 测试辅助函数：创建Clock
    fun setup_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    // 测试辅助函数：创建测试代币
    fun mint_test_coin(amount: u64, ctx: &mut sui::tx_context::TxContext): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ctx)
    }

    // ==================== 测试用例 ====================

    #[test]
    /// 测试1：挂牌出售数据
    fun test_list_data() {
        let mut scenario = ts::begin(ADMIN);

        // 初始化模块
        {
            market::init_for_testing(ts::ctx(&mut scenario));
        };

        let clock = setup_clock(&mut scenario);

        // SELLER挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let data_record_id = object::id_from_address(@0x123);

            market::list_data(
                &mut marketplace,
                data_record_id,
                500000000, // 0.5 SUI
                string::utf8(b"medical"),
                string::utf8(b"Patient records dataset"),
                &clock,
                ts::ctx(&mut scenario)
            );

            // 验证统计信息
            assert!(market::get_active_listings_count(&marketplace) == 1, 1);

            ts::return_shared(marketplace);
        };

        // 验证挂牌对象已创建
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut listing = ts::take_shared<DataListing>(&scenario);

            assert!(market::get_listing_owner(&listing) == SELLER, 2);
            assert!(market::get_listing_price(&listing) == 500000000, 3);
            assert!(market::is_listing_active(&listing), 4);
            assert!(market::get_total_sales(&listing) == 0, 5);

            ts::return_shared(listing);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试2：购买数据访问权限
    fun test_purchase_data_access() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // SELLER挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let data_record_id = object::id_from_address(@0x456);

            market::list_data(
                &mut marketplace,
                data_record_id,
                300000000, // 0.3 SUI
                string::utf8(b"financial"),
                string::utf8(b"Transaction data"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
        };

        // BUYER购买访问权限
        ts::next_tx(&mut scenario, BUYER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let mut listing = ts::take_shared<DataListing>(&scenario);

            // 创建支付代币
            let payment = mint_test_coin(300000000, ts::ctx(&mut scenario));

            market::purchase_data_access(
                &mut marketplace,
                &mut listing,
                payment,
                0, // 永久访问
                &clock,
                ts::ctx(&mut scenario)
            );

            // 验证统计信息已更新
            assert!(market::get_total_sales(&listing) == 1, 6);
            assert!(market::has_purchased(&listing, BUYER), 7);
            assert!(market::get_total_volume(&marketplace) == 300000000, 8);

            ts::return_shared(marketplace);
            ts::return_shared(listing);
        };

        // 验证购买记录已转移给买家
        ts::next_tx(&mut scenario, BUYER);
        {
            let purchase = ts::take_from_sender<Purchase>(&scenario);
            ts::return_to_sender(&scenario, purchase);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = market::EAlreadyPurchased)]
    /// 测试3：重复购买应该失败
    fun test_duplicate_purchase_fails() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            market::list_data(
                &mut marketplace,
                object::id_from_address(@0x789),
                200000000,
                string::utf8(b"test"),
                string::utf8(b"Test data"),
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(marketplace);
        };

        // 第一次购买
        ts::next_tx(&mut scenario, BUYER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let mut listing = ts::take_shared<DataListing>(&scenario);
            let payment = mint_test_coin(200000000, ts::ctx(&mut scenario));

            market::purchase_data_access(
                &mut marketplace,
                &mut listing,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
            ts::return_shared(listing);
        };

        // 第二次购买（应该失败）
        ts::next_tx(&mut scenario, BUYER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let mut listing = ts::take_shared<DataListing>(&scenario);
            let payment = mint_test_coin(200000000, ts::ctx(&mut scenario));

            market::purchase_data_access(
                &mut marketplace,
                &mut listing,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
            ts::return_shared(listing);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试4：更新挂牌价格
    fun test_update_listing_price() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            market::list_data(
                &mut marketplace,
                object::id_from_address(@0xabc),
                400000000,
                string::utf8(b"survey"),
                string::utf8(b"Survey results"),
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(marketplace);
        };

        // SELLER更新价格
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut listing = ts::take_shared<DataListing>(&scenario);

            assert!(market::get_listing_price(&listing) == 400000000, 9);

            market::update_listing_price(
                &mut listing,
                600000000, // 新价格 0.6 SUI
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(market::get_listing_price(&listing) == 600000000, 10);

            ts::return_shared(listing);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试5：下架数据
    fun test_delist_data() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            market::list_data(
                &mut marketplace,
                object::id_from_address(@0xdef),
                300000000,
                string::utf8(b"test"),
                string::utf8(b"Test"),
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(marketplace);
        };

        // SELLER下架数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let mut listing = ts::take_shared<DataListing>(&scenario);

            assert!(market::is_listing_active(&listing), 11);

            market::delist_data(
                &mut marketplace,
                &mut listing,
                ts::ctx(&mut scenario)
            );

            assert!(!market::is_listing_active(&listing), 12);
            assert!(market::get_active_listings_count(&marketplace) == 0, 13);

            ts::return_shared(marketplace);
            ts::return_shared(listing);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试6：质押代币
    fun test_stake() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // STAKER质押代币
        ts::next_tx(&mut scenario, STAKER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);

            // 创建质押代币（2 SUI）
            let stake_coin = mint_test_coin(2000000000, ts::ctx(&mut scenario));

            market::stake(
                &mut marketplace,
                stake_coin,
                string::utf8(b"provider"),
                object::id_from_address(@0x111),
                86400000, // 24小时锁定期
                &clock,
                ts::ctx(&mut scenario)
            );

            // 验证统计信息
            assert!(market::get_total_staked(&marketplace) == 2000000000, 14);

            ts::return_shared(marketplace);
        };

        // 验证质押记录已转移给质押者
        ts::next_tx(&mut scenario, STAKER);
        {
            let stake_record = ts::take_from_sender<StakeRecord>(&scenario);

            assert!(market::get_stake_amount(&stake_record) == 2000000000, 15);
            assert!(!market::is_stake_unlocked(&stake_record), 16);

            ts::return_to_sender(&scenario, stake_record);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试7：解除质押
    fun test_unstake() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let mut clock = setup_clock(&mut scenario);

        // 质押代币
        ts::next_tx(&mut scenario, STAKER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let stake_coin = mint_test_coin(1000000000, ts::ctx(&mut scenario));

            market::stake(
                &mut marketplace,
                stake_coin,
                string::utf8(b"verifier"),
                object::id_from_address(@0x222),
                1000, // 1秒锁定期（方便测试）
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
        };

        // 推进时间
        clock::increment_for_testing(&mut clock, 2000); // 推进2秒

        // 解除质押
        ts::next_tx(&mut scenario, STAKER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let stake_record = ts::take_from_sender<StakeRecord>(&scenario);

            market::unstake(
                &mut marketplace,
                stake_record,
                &clock,
                ts::ctx(&mut scenario)
            );

            // 验证统计信息已更新
            assert!(market::get_total_staked(&marketplace) == 0, 17);

            ts::return_shared(marketplace);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = market::EStakeLocked)]
    /// 测试8：锁定期内无法解押（应该失败）
    fun test_unstake_before_unlock_fails() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 质押代币（长锁定期）
        ts::next_tx(&mut scenario, STAKER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let stake_coin = mint_test_coin(1000000000, ts::ctx(&mut scenario));

            market::stake(
                &mut marketplace,
                stake_coin,
                string::utf8(b"provider"),
                object::id_from_address(@0x333),
                86400000, // 24小时锁定期
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
        };

        // 立即尝试解押（应该失败）
        ts::next_tx(&mut scenario, STAKER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let stake_record = ts::take_from_sender<StakeRecord>(&scenario);

            market::unstake(
                &mut marketplace,
                stake_record,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试9：分配验证者奖励
    fun test_distribute_verifier_reward() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 先往奖励池充值（通过购买数据）
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            market::list_data(
                &mut marketplace,
                object::id_from_address(@0x555),
                1000000000, // 1 SUI
                string::utf8(b"test"),
                string::utf8(b"Test data"),
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(marketplace);
        };

        ts::next_tx(&mut scenario, BUYER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let mut listing = ts::take_shared<DataListing>(&scenario);
            let payment = mint_test_coin(1000000000, ts::ctx(&mut scenario));

            market::purchase_data_access(
                &mut marketplace,
                &mut listing,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(marketplace);
            ts::return_shared(listing);
        };

        // 分配奖励给验证者
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);

            let reward_pool_before = market::get_reward_pool_balance(&marketplace);
            assert!(reward_pool_before > 0, 18);

            market::distribute_verifier_reward(
                &mut marketplace,
                VERIFIER,
                10000000, // 0.01 SUI
                string::utf8(b"ZKP verification reward"),
                &clock,
                ts::ctx(&mut scenario)
            );

            // 验证奖励池余额减少
            let reward_pool_after = market::get_reward_pool_balance(&marketplace);
            assert!(reward_pool_after == reward_pool_before - 10000000, 19);

            ts::return_shared(marketplace);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = market::ENotOwner)]
    /// 测试10：非owner无法更新价格（应该失败）
    fun test_update_price_not_owner() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // SELLER挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            market::list_data(
                &mut marketplace,
                object::id_from_address(@0x666),
                500000000,
                string::utf8(b"test"),
                string::utf8(b"Test"),
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(marketplace);
        };

        // BUYER尝试更新价格（应该失败）
        ts::next_tx(&mut scenario, BUYER);
        {
            let mut listing = ts::take_shared<DataListing>(&scenario);

            market::update_listing_price(
                &mut listing,
                100000000,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(listing);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试11：查询函数
    fun test_query_functions() {
        let mut scenario = ts::begin(ADMIN);

        market::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 挂牌数据
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            market::list_data(
                &mut marketplace,
                object::id_from_address(@0x777),
                800000000,
                string::utf8(b"medical"),
                string::utf8(b"Medical data"),
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(marketplace);
        };

        // 测试查询函数
        ts::next_tx(&mut scenario, SELLER);
        {
            let mut marketplace = ts::take_shared<Marketplace>(&scenario);
            let mut listing = ts::take_shared<DataListing>(&scenario);

            // Listing查询
            assert!(market::get_listing_owner(&listing) == SELLER, 20);
            assert!(market::get_listing_price(&listing) == 800000000, 21);
            assert!(market::is_listing_active(&listing), 22);
            assert!(market::get_total_sales(&listing) == 0, 23);
            assert!(!market::has_purchased(&listing, BUYER), 24);

            // Marketplace查询
            assert!(market::get_total_volume(&marketplace) == 0, 25);
            assert!(market::get_active_listings_count(&marketplace) == 1, 26);
            assert!(market::get_total_staked(&marketplace) == 0, 27);

            ts::return_shared(marketplace);
            ts::return_shared(listing);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
