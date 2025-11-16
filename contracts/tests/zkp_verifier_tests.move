#[test_only]
module hydra::zkp_verifier_tests {
    use hydra::zkp_verifier::{Self, VerificationKey, ComputationResult, ZKPRegistry};
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use std::vector;
    use sui::object;

    // 测试地址
    const ADMIN: address = @0xAD;
    const PROVER: address = @0xA;
    const VERIFIER: address = @0xB;
    const USER_C: address = @0xC;

    // 测试辅助函数：创建Clock
    fun setup_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    // 测试辅助函数：创建数据记录ID列表
    fun create_data_record_ids(): vector<object::ID> {
        let mut ids = vector::empty<object::ID>();
        // 创建3个模拟ID
        vector::push_back(&mut ids, object::id_from_address(@0x111));
        vector::push_back(&mut ids, object::id_from_address(@0x222));
        vector::push_back(&mut ids, object::id_from_address(@0x333));
        ids
    }

    // ==================== 测试用例 ====================

    #[test]
    /// 测试1：注册ZKP电路
    fun test_register_circuit() {
        let mut scenario = ts::begin(ADMIN);

        // 初始化模块
        {
            zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        };

        let clock = setup_clock(&mut scenario);

        // 注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"average"),
                1, // CURVE_BN254
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Average computation circuit"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 验证电路已注册
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);
            let mut vk = ts::take_shared<VerificationKey>(&scenario);

            assert!(zkp_verifier::get_circuit_count(&registry) == 1, 1);
            assert!(zkp_verifier::is_circuit_registered(&registry, string::utf8(b"average")), 2);
            assert!(zkp_verifier::get_circuit_name(&vk) == string::utf8(b"average"), 3);
            assert!(zkp_verifier::is_circuit_active(&vk), 4);

            ts::return_shared(registry);
            ts::return_shared(vk);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试2：提交证明
    fun test_submit_proof() {
        let mut scenario = ts::begin(ADMIN);

        zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"average"),
                1,
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Average computation"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // PROVER提交证明
        ts::next_tx(&mut scenario, PROVER);
        {
            zkp_verifier::submit_proof(
                zkp_verifier::create_mock_proof(),
                zkp_verifier::create_mock_public_inputs(),
                string::utf8(b"average"),
                create_data_record_ids(),
                string::utf8(b"Test computation"),
                &clock,
                ts::ctx(&mut scenario)
            );
        };

        // 验证证明对象已创建
        ts::next_tx(&mut scenario, PROVER);
        {
            let mut result = ts::take_shared<ComputationResult>(&scenario);

            assert!(zkp_verifier::get_result_prover(&result) == PROVER, 5);
            assert!(!zkp_verifier::is_result_verified(&result), 6);
            assert!(vector::length(&zkp_verifier::get_data_record_ids(&result)) == 3, 7);

            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试3：验证证明（使用占位符验证逻辑）
    /// 注意：当前实现使用简化的验证（检查数据长度），生产环境需要真实的Groth16验证
    fun test_verify_proof_with_mock_data() {
        let mut scenario = ts::begin(ADMIN);

        zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"average"),
                1,
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Average computation"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 提交证明
        ts::next_tx(&mut scenario, PROVER);
        {
            zkp_verifier::submit_proof(
                zkp_verifier::create_mock_proof(),
                zkp_verifier::create_mock_public_inputs(),
                string::utf8(b"average"),
                create_data_record_ids(),
                string::utf8(b"Test"),
                &clock,
                ts::ctx(&mut scenario)
            );
        };

        // 验证证明（占位符验证应该通过）
        ts::next_tx(&mut scenario, VERIFIER);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);
            let mut result = ts::take_shared<ComputationResult>(&scenario);
            let mut vk = ts::take_shared<VerificationKey>(&scenario);

            // 使用占位符验证逻辑验证证明
            zkp_verifier::verify_proof(
                &mut registry,
                &mut result,
                &vk,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_shared(result);
            ts::return_shared(vk);
        };

        // 验证结果已被标记为已验证
        ts::next_tx(&mut scenario, VERIFIER);
        {
            let result = ts::take_shared<ComputationResult>(&scenario);
            assert!(zkp_verifier::is_result_verified(&result), 100);
            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试4：更新电路状态
    fun test_update_circuit_status() {
        let mut scenario = ts::begin(ADMIN);

        zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"threshold"),
                2, // CURVE_BLS12_381
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Threshold query circuit"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // ADMIN停用电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vk = ts::take_shared<VerificationKey>(&scenario);

            assert!(zkp_verifier::is_circuit_active(&vk), 8);

            zkp_verifier::update_circuit_status(
                &mut vk,
                false,
                ts::ctx(&mut scenario)
            );

            assert!(!zkp_verifier::is_circuit_active(&vk), 9);

            ts::return_shared(vk);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试5：转移电路所有权
    fun test_transfer_circuit_ownership() {
        let mut scenario = ts::begin(ADMIN);

        zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // ADMIN注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"sum"),
                1,
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Sum circuit"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // ADMIN转移所有权给USER_C
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut vk = ts::take_shared<VerificationKey>(&scenario);

            zkp_verifier::transfer_circuit_ownership(
                &mut vk,
                USER_C,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(vk);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = zkp_verifier::ENotOwner)]
    /// 测试6：非owner无法更新电路（应该失败）
    fun test_update_circuit_not_owner() {
        let mut scenario = ts::begin(ADMIN);

        zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // ADMIN注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"test"),
                1,
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Test"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // PROVER尝试停用电路（应该失败）
        ts::next_tx(&mut scenario, PROVER);
        {
            let mut vk = ts::take_shared<VerificationKey>(&scenario);

            zkp_verifier::update_circuit_status(
                &mut vk,
                false,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(vk);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    /// 测试7：查询函数
    fun test_query_functions() {
        let mut scenario = ts::begin(ADMIN);

        zkp_verifier::init_for_testing(ts::ctx(&mut scenario));
        let clock = setup_clock(&mut scenario);

        // 注册电路
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);

            zkp_verifier::register_circuit(
                &mut registry,
                string::utf8(b"query_test"),
                1,
                zkp_verifier::create_mock_vk_data(),
                string::utf8(b"Query test circuit"),
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // 提交证明
        ts::next_tx(&mut scenario, PROVER);
        {
            zkp_verifier::submit_proof(
                zkp_verifier::create_mock_proof(),
                zkp_verifier::create_mock_public_inputs(),
                string::utf8(b"query_test"),
                create_data_record_ids(),
                string::utf8(b"Test metadata"),
                &clock,
                ts::ctx(&mut scenario)
            );
        };

        // 测试查询函数
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut registry = ts::take_shared<ZKPRegistry>(&scenario);
            let mut vk = ts::take_shared<VerificationKey>(&scenario);
            let mut result = ts::take_shared<ComputationResult>(&scenario);

            // VK查询
            assert!(zkp_verifier::get_circuit_name(&vk) == string::utf8(b"query_test"), 10);
            assert!(zkp_verifier::get_circuit_curve_type(&vk) == 1, 11);
            assert!(zkp_verifier::is_circuit_active(&vk), 12);

            // Result查询
            assert!(zkp_verifier::get_result_prover(&result) == PROVER, 13);
            assert!(!zkp_verifier::is_result_verified(&result), 14);
            assert!(vector::length(&zkp_verifier::get_public_inputs(&result)) == 32, 15);
            assert!(vector::length(&zkp_verifier::get_data_record_ids(&result)) == 3, 16);

            // Registry查询
            assert!(zkp_verifier::get_circuit_count(&registry) == 1, 17);
            assert!(zkp_verifier::get_total_verifications(&registry) == 0, 18);
            assert!(zkp_verifier::is_circuit_registered(&registry, string::utf8(b"query_test")), 19);

            ts::return_shared(registry);
            ts::return_shared(vk);
            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
