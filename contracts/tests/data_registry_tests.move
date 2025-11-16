#[test_only]
module hydra::data_registry_tests {
    use hydra::data_registry::{Self, DataRecord, AccessGrant, DataRegistry};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use std::vector;

    // 测试地址
    const ADMIN: address = @0xAD;
    const USER_A: address = @0xA;
    const USER_B: address = @0xB;
    const USER_C: address = @0xC;

    // 测试辅助函数：创建测试数据哈希
    fun create_test_hash(): vector<u8> {
        let mut hash = vector::empty<u8>();
        let mut i = 0;
        while (i < 32) {
            vector::push_back(&mut hash, (i as u8));
            i = i + 1;
        };
        hash
    }

    // 测试辅助函数：创建Clock
    fun setup_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    // ==================== 测试用例 ====================

    #[test]
    /// 测试1：完整的数据注册流程
    fun test_register_data() {
        let mut scenario = ts::begin(ADMIN);
        
        // 初始化模块
        {
            data_registry::init_for_testing(ts::ctx(&mut scenario));
        };

        // 创建Clock
        let clock = setup_clock(&mut scenario);

        // USER_A注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_123"),
                create_test_hash(),
                1024,
                string::utf8(b"medical"),
                string::utf8(b"Patient records"),
                true,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 验证数据记录被创建
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            
            assert!(data_registry::get_owner(&data_record) == USER_A, 1);
            assert!(data_registry::get_blob_id(&data_record) == string::utf8(b"blob_123"), 2);
            assert!(data_registry::get_data_size(&data_record) == 1024, 3);
            assert!(data_registry::is_encrypted(&data_record) == true, 4);
            assert!(data_registry::is_public(&data_record) == false, 5);

            ts::return_shared(data_record);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试2：授权与访问验证
    fun test_grant_access() {
        let mut scenario = ts::begin(ADMIN);
        
        data_registry::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // USER_A注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_456"),
                create_test_hash(),
                2048,
                string::utf8(b"financial"),
                string::utf8(b"Transaction data"),
                true,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // USER_A授权给USER_B
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            
            data_registry::grant_access(
                &mut data_record,
                USER_B,
                string::utf8(b"read"),
                0, // 永久访问
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(data_record);
        };

        // 验证USER_B有访问权限
        ts::next_tx(&mut scenario, USER_B);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            let mut access_grant = ts::take_shared<AccessGrant>(&scenario);
            
            let has_access = data_registry::verify_access(
                &data_record,
                &access_grant,
                USER_B,
                clock::timestamp_ms(&clock)
            );
            assert!(has_access == true, 6);

            // 验证USER_C没有访问权限
            let no_access = data_registry::verify_access(
                &data_record,
                &access_grant,
                USER_C,
                clock::timestamp_ms(&clock)
            );
            assert!(no_access == false, 7);

            ts::return_shared(data_record);
            ts::return_shared(access_grant);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试3：撤销权限
    fun test_revoke_access() {
        let mut scenario = ts::begin(ADMIN);
        
        data_registry::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_789"),
                create_test_hash(),
                512,
                string::utf8(b"survey"),
                string::utf8(b"Survey results"),
                false,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // 授权给USER_B
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            data_registry::grant_access(
                &mut data_record,
                USER_B,
                string::utf8(b"compute"),
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(data_record);
        };

        // 撤销授权
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            data_registry::revoke_access(
                &mut data_record,
                USER_B,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // 验证授权已被移除
            assert!(data_registry::has_access_grant(&data_record, USER_B) == false, 8);
            
            ts::return_shared(data_record);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试4：更新元数据
    fun test_update_metadata() {
        let mut scenario = ts::begin(ADMIN);
        
        data_registry::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_update"),
                create_test_hash(),
                1024,
                string::utf8(b"medical"),
                string::utf8(b"Old description"),
                true,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // 更新描述
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            data_registry::update_metadata(
                &mut data_record,
                string::utf8(b"New description"),
                &clock,
                ts::ctx(&mut scenario)
            );
            
            assert!(data_registry::get_description(&data_record) == string::utf8(b"New description"), 9);
            
            ts::return_shared(data_record);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试5：所有权转移
    fun test_transfer_ownership() {
        let mut scenario = ts::begin(ADMIN);
        
        data_registry::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // USER_A注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_transfer"),
                create_test_hash(),
                2048,
                string::utf8(b"financial"),
                string::utf8(b"Transfer test"),
                true,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // USER_A转移所有权给USER_C
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            data_registry::transfer_ownership(
                &mut data_record,
                USER_C,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            assert!(data_registry::get_owner(&data_record) == USER_C, 10);
            
            ts::return_shared(data_record);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = data_registry::ENotOwner)]
    /// 测试6：非owner无法授权（应该失败）
    fun test_grant_access_not_owner() {
        let mut scenario = ts::begin(ADMIN);
        
        data_registry::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // USER_A注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_fail"),
                create_test_hash(),
                512,
                string::utf8(b"test"),
                string::utf8(b"Test"),
                false,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // USER_B尝试授权（应该失败）
        ts::next_tx(&mut scenario, USER_B);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            data_registry::grant_access(
                &mut data_record,
                USER_C,
                string::utf8(b"read"),
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(data_record);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试7：记录数据访问
    fun test_record_access() {
        let mut scenario = ts::begin(ADMIN);
        
        data_registry::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册数据
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut registry = ts::take_shared<DataRegistry>(&scenario);
            data_registry::register_data(
                &mut registry,
                string::utf8(b"blob_access"),
                create_test_hash(),
                1024,
                string::utf8(b"medical"),
                string::utf8(b"Access test"),
                true,
                false,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // 授权给USER_B
        ts::next_tx(&mut scenario, USER_A);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            data_registry::grant_access(
                &mut data_record,
                USER_B,
                string::utf8(b"read"),
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(data_record);
        };

        // USER_B访问数据
        ts::next_tx(&mut scenario, USER_B);
        {
            let mut data_record = ts::take_shared<DataRecord>(&scenario);
            let mut access_grant = ts::take_shared<AccessGrant>(&scenario);
            
            let initial_count = data_registry::get_access_count(&data_record);
            
            data_registry::record_access(
                &mut data_record,
                &mut access_grant,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            assert!(data_registry::get_access_count(&data_record) == initial_count + 1, 11);
            
            ts::return_shared(data_record);
            ts::return_shared(access_grant);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}


