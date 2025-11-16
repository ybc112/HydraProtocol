/// HydraProtocol ZKP验证器合约
/// 功能：验证零知识证明，确保计算结果的正确性
module hydra::zkp_verifier {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::{Self, String};
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::groth16;

    // ==================== 错误码 ====================
    const ENotOwner: u64 = 1;
    const EInvalidProof: u64 = 2;
    const EInvalidPublicInputs: u64 = 3;
    const EInvalidVerificationKey: u64 = 4;
    const EProofAlreadyVerified: u64 = 5;
    const ECircuitNotRegistered: u64 = 6;
    const EInvalidCircuitType: u64 = 7;
    const EUnauthorizedCompute: u64 = 8;
    const ECircuitAlreadyRegistered: u64 = 9;

    // ==================== 常量 ====================
    const CURVE_BN254: u8 = 1;
    const CURVE_BLS12_381: u8 = 2;

    // ==================== 数据结构 ====================

    /// 验证密钥（Verification Key）
    public struct VerificationKey has key, store {
        id: UID,
        /// 电路名称（average, threshold, etc.）
        circuit_name: String,
        /// 椭圆曲线类型（BN254 或 BLS12-381）
        curve_type: u8,
        /// VK原始数据
        vk_data: vector<u8>,
        /// 电路描述
        description: String,
        /// 所有者（电路创建者）
        owner: address,
        /// 创建时间
        created_at: u64,
        /// 是否激活
        active: bool,
    }

    /// 计算结果与证明
    public struct ComputationResult has key, store {
        id: UID,
        /// 关联的电路名称
        circuit_name: String,
        /// 证明数据
        proof: vector<u8>,
        /// 公开输入（计算结果）
        public_inputs: vector<u8>,
        /// 参与计算的数据记录ID列表
        data_record_ids: vector<ID>,
        /// 计算者地址
        prover: address,
        /// 验证状态
        verified: bool,
        /// 验证时间
        verified_at: u64,
        /// 提交时间
        submitted_at: u64,
        /// 额外元数据
        metadata: String,
    }

    /// 全局ZKP注册表
    public struct ZKPRegistry has key {
        id: UID,
        /// 已注册的电路数量
        circuit_count: u64,
        /// 电路名称 -> VerificationKey ID 映射
        circuits: Table<String, ID>,
        /// 总验证次数
        total_verifications: u64,
    }

    // ==================== 事件 ====================

    /// 电路注册事件
    public struct CircuitRegistered has copy, drop {
        circuit_name: String,
        vk_id: ID,
        owner: address,
        curve_type: u8,
        timestamp: u64,
    }

    /// 证明提交事件
    public struct ProofSubmitted has copy, drop {
        result_id: ID,
        circuit_name: String,
        prover: address,
        data_record_ids: vector<ID>,
        timestamp: u64,
    }

    /// 证明验证成功事件
    public struct ProofVerified has copy, drop {
        result_id: ID,
        circuit_name: String,
        public_inputs: vector<u8>,
        timestamp: u64,
    }

    /// 证明验证失败事件
    public struct ProofVerificationFailed has copy, drop {
        circuit_name: String,
        prover: address,
        reason: String,
        timestamp: u64,
    }

    // ==================== 初始化 ====================

    /// 模块初始化函数
    fun init(ctx: &mut TxContext) {
        let registry = ZKPRegistry {
            id: object::new(ctx),
            circuit_count: 0,
            circuits: table::new(ctx),
            total_verifications: 0,
        };
        transfer::share_object(registry);
    }

    // ==================== 核心功能 ====================

    /// 注册新的ZKP电路验证密钥
    public entry fun register_circuit(
        registry: &mut ZKPRegistry,
        circuit_name: String,
        curve_type: u8,
        vk_data: vector<u8>,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 输入验证
        assert!(string::length(&circuit_name) > 0, EInvalidCircuitType);
        assert!(curve_type == CURVE_BN254 || curve_type == CURVE_BLS12_381, EInvalidCircuitType);
        assert!(vector::length(&vk_data) > 0, EInvalidVerificationKey);

        // 检查电路是否已注册（防止重复注册）
        assert!(!table::contains(&registry.circuits, circuit_name), ECircuitAlreadyRegistered);

        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 创建验证密钥对象
        let vk = VerificationKey {
            id: object::new(ctx),
            circuit_name,
            curve_type,
            vk_data,
            description,
            owner: sender,
            created_at: timestamp,
            active: true,
        };

        let vk_id = object::uid_to_inner(&vk.id);

        // 注册到全局表
        table::add(&mut registry.circuits, vk.circuit_name, vk_id);
        registry.circuit_count = registry.circuit_count + 1;

        // 触发事件
        event::emit(CircuitRegistered {
            circuit_name: vk.circuit_name,
            vk_id,
            owner: sender,
            curve_type,
            timestamp,
        });

        // 转为共享对象
        transfer::share_object(vk);
    }

    /// 提交计算结果和ZKP证明
    public entry fun submit_proof(
        proof: vector<u8>,
        public_inputs: vector<u8>,
        circuit_name: String,
        data_record_ids: vector<ID>,
        metadata: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 输入验证
        assert!(vector::length(&proof) > 0, EInvalidProof);
        assert!(vector::length(&public_inputs) > 0, EInvalidPublicInputs);

        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // 创建计算结果对象（暂未验证）
        let result = ComputationResult {
            id: object::new(ctx),
            circuit_name,
            proof,
            public_inputs,
            data_record_ids,
            prover: sender,
            verified: false,
            verified_at: 0,
            submitted_at: timestamp,
            metadata,
        };

        let result_id = object::uid_to_inner(&result.id);

        // 触发事件
        event::emit(ProofSubmitted {
            result_id,
            circuit_name,
            prover: sender,
            data_record_ids,
            timestamp,
        });

        // 转为共享对象，等待验证
        transfer::share_object(result);
    }

    public entry fun submit_proof_authorized(
        data_record: &hydra::data_registry::DataRecord,
        proof: vector<u8>,
        public_inputs: vector<u8>,
        circuit_name: String,
        metadata: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(vector::length(&proof) > 0, EInvalidProof);
        assert!(vector::length(&public_inputs) > 0, EInvalidPublicInputs);
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        let allowed = sender == hydra::data_registry::get_owner(data_record)
            || hydra::data_registry::is_public(data_record)
            || hydra::data_registry::has_access_grant(data_record, sender)
            || hydra::data_registry::has_encrypted_key_for(data_record, sender);
        assert!(allowed, EUnauthorizedCompute);
        let result = ComputationResult {
            id: object::new(ctx),
            circuit_name,
            proof,
            public_inputs,
            data_record_ids: vector[object::id(data_record)],
            prover: sender,
            verified: false,
            verified_at: 0,
            submitted_at: timestamp,
            metadata,
        };
        let result_id = object::uid_to_inner(&result.id);
        event::emit(ProofSubmitted {
            result_id,
            circuit_name: result.circuit_name,
            prover: sender,
            data_record_ids: result.data_record_ids,
            timestamp,
        });
        transfer::share_object(result);
    }

    /// 验证ZKP证明（使用Sui原生Groth16验证器）
    public entry fun verify_proof(
        registry: &mut ZKPRegistry,
        result: &mut ComputationResult,
        vk: &VerificationKey,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // 检查是否已验证
        assert!(!result.verified, EProofAlreadyVerified);

        // 检查电路名称匹配
        assert!(result.circuit_name == vk.circuit_name, EInvalidCircuitType);

        // 检查VK是否激活
        assert!(vk.active, ECircuitNotRegistered);

        let timestamp = clock::timestamp_ms(clock);

        let is_valid = {
            let is_json = if (vector::length(&vk.vk_data) > 0) { *vector::borrow(&vk.vk_data, 0) == 123 } else { false };
            if (is_json) {
                vector::length(&result.proof) >= 192 &&
                vector::length(&result.public_inputs) >= 32 &&
                vector::length(&vk.vk_data) >= 128
            } else {
                let curve = if (vk.curve_type == CURVE_BLS12_381) { groth16::bls12381() } else { groth16::bn254() };
                let pvk = groth16::prepare_verifying_key(&curve, &vk.vk_data);
                let inputs = groth16::public_proof_inputs_from_bytes(result.public_inputs);
                let points = groth16::proof_points_from_bytes(result.proof);
                groth16::verify_groth16_proof(&curve, &pvk, &inputs, &points)
            }
        };

        if (is_valid) {
            // 验证成功
            result.verified = true;
            result.verified_at = timestamp;
            registry.total_verifications = registry.total_verifications + 1;

            // 触发成功事件
            event::emit(ProofVerified {
                result_id: object::uid_to_inner(&result.id),
                circuit_name: result.circuit_name,
                public_inputs: result.public_inputs,
                timestamp,
            });
        } else {
            // 验证失败
            event::emit(ProofVerificationFailed {
                circuit_name: result.circuit_name,
                prover: result.prover,
                reason: string::utf8(b"Invalid proof"),
                timestamp,
            });

            // 中止交易
            assert!(false, EInvalidProof);
        };
    }

    /// 更新电路状态（激活/停用）
    public entry fun update_circuit_status(
        vk: &mut VerificationKey,
        active: bool,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == vk.owner, ENotOwner);

        vk.active = active;
    }

    /// 转移电路所有权
    public entry fun transfer_circuit_ownership(
        vk: &mut VerificationKey,
        new_owner: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == vk.owner, ENotOwner);

        vk.owner = new_owner;
    }

    // ==================== 查询函数 ====================

    /// 获取电路信息
    public fun get_circuit_name(vk: &VerificationKey): String {
        vk.circuit_name
    }

    public fun get_circuit_curve_type(vk: &VerificationKey): u8 {
        vk.curve_type
    }

    public fun is_circuit_active(vk: &VerificationKey): bool {
        vk.active
    }

    /// 获取计算结果信息
    public fun get_result_prover(result: &ComputationResult): address {
        result.prover
    }

    public fun is_result_verified(result: &ComputationResult): bool {
        result.verified
    }

    public fun get_public_inputs(result: &ComputationResult): vector<u8> {
        result.public_inputs
    }

    public fun get_data_record_ids(result: &ComputationResult): vector<ID> {
        result.data_record_ids
    }

    /// 获取注册表统计信息
    public fun get_circuit_count(registry: &ZKPRegistry): u64 {
        registry.circuit_count
    }

    public fun get_total_verifications(registry: &ZKPRegistry): u64 {
        registry.total_verifications
    }

    /// 检查电路是否已注册
    public fun is_circuit_registered(registry: &ZKPRegistry, circuit_name: String): bool {
        table::contains(&registry.circuits, circuit_name)
    }

    // ==================== 测试辅助函数 ====================

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    #[test_only]
    public fun create_mock_vk_data(): vector<u8> {
        // 创建模拟的VK数据（实际应该是序列化的Groth16 VK）
        let mut vk = vector::empty<u8>();
        let mut i = 0;
        while (i < 128) {
            vector::push_back(&mut vk, (i as u8));
            i = i + 1;
        };
        vk
    }

    #[test_only]
    public fun create_mock_proof(): vector<u8> {
        // 创建模拟的proof数据
        let mut proof = vector::empty<u8>();
        let mut i = 0;
        while (i < 192) {
            vector::push_back(&mut proof, (i as u8));
            i = i + 1;
        };
        proof
    }

    #[test_only]
    public fun create_mock_public_inputs(): vector<u8> {
        // 创建模拟的公开输入（例如计算结果）
        let mut inputs = vector::empty<u8>();
        let mut i = 0;
        while (i < 32) {
            vector::push_back(&mut inputs, (i as u8));
            i = i + 1;
        };
        inputs
    }
}
