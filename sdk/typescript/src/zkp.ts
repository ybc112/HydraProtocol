import * as snarkjs from 'snarkjs';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * ZKP证明生成器
 *
 * 功能：
 * - 生成ZK证明
 * - 验证ZK证明
 * - 管理电路文件
 */
export class ZKProver {
    private circuitPath: string;
    private zkeyPath: string;
    private vkeyPath: string;

    constructor(circuitName: string, circuitsDir?: string) {
        const baseDir = circuitsDir || path.join(__dirname, '../../../circuits/build');
        this.circuitPath = path.join(baseDir, circuitName);
        this.zkeyPath = path.join(this.circuitPath, 'circuit_final.zkey');
        this.vkeyPath = path.join(this.circuitPath, 'verification_key.json');
    }

    /**
     * 生成ZK证明
     *
     * @param inputs - 电路输入
     * @returns 证明和公开输入
     */
    async generateProof(inputs: Record<string, any>): Promise<ProofResult> {
        try {
            console.log(`🔐 生成ZK证明...`);

            // 计算witness
            const wasmPath = path.join(this.circuitPath, `${path.basename(this.circuitPath)}.wasm`);

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                inputs,
                wasmPath,
                this.zkeyPath
            );

            console.log(`✅ 证明生成成功`);

            return {
                proof: this.formatProof(proof),
                publicInputs: publicSignals.map((s: string) => BigInt(s))
            };
        } catch (error: any) {
            console.error('❌ 证明生成失败:', error.message);
            throw new Error(`ZK证明生成失败: ${error.message}`);
        }
    }

    /**
     * 验证ZK证明
     *
     * @param proof - 证明
     * @param publicInputs - 公开输入
     * @returns 验证结果
     */
    async verifyProof(proof: FormattedProof, publicInputs: bigint[]): Promise<boolean> {
        try {
            console.log(`🔍 验证ZK证明...`);

            // 读取验证密钥
            const vkeyData = await fs.readFile(this.vkeyPath, 'utf-8');
            const vkey = JSON.parse(vkeyData);

            // 转换证明格式
            const snarkjsProof = this.unformatProof(proof);

            // 验证
            const isValid = await snarkjs.groth16.verify(
                vkey,
                publicInputs.map(i => i.toString()),
                snarkjsProof
            );

            console.log(`${isValid ? '✅' : '❌'} 验证${isValid ? '成功' : '失败'}`);

            return isValid;
        } catch (error: any) {
            console.error('❌ 验证失败:', error.message);
            return false;
        }
    }

    /**
     * 格式化证明（转换为Sui合约需要的格式）
     *
     * @param proof - SnarkJS证明
     * @returns 格式化的证明
     */
    private formatProof(proof: any): FormattedProof {
        return {
            pi_a: [
                BigInt(proof.pi_a[0]),
                BigInt(proof.pi_a[1])
            ],
            pi_b: [
                [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])],
                [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]
            ],
            pi_c: [
                BigInt(proof.pi_c[0]),
                BigInt(proof.pi_c[1])
            ]
        };
    }

    /**
     * 反格式化证明（转换为SnarkJS格式）
     *
     * @param proof - 格式化的证明
     * @returns SnarkJS证明
     */
    private unformatProof(proof: FormattedProof): any {
        return {
            pi_a: proof.pi_a.map(x => x.toString()),
            pi_b: proof.pi_b.map(row => row.map(x => x.toString())),
            pi_c: proof.pi_c.map(x => x.toString()),
            protocol: 'groth16',
            curve: 'bn128'
        };
    }

    /**
     * 将证明编码为字节数组（用于上链）
     *
     * @param proof - 格式化的证明
     * @returns 字节数组
     */
    encodeProof(proof: FormattedProof): Uint8Array {
        // Groth16证明格式：
        // pi_a (2 elements) + pi_b (4 elements) + pi_c (2 elements)
        // 每个元素32字节 = 8 * 32 = 256字节
        // 但Sui可能使用不同的编码，这里简化为JSON编码

        const jsonString = JSON.stringify({
            pi_a: proof.pi_a.map(x => x.toString()),
            pi_b: proof.pi_b.map(row => row.map(x => x.toString())),
            pi_c: proof.pi_c.map(x => x.toString())
        });

        return new TextEncoder().encode(jsonString);
    }

    /**
     * 解码证明
     *
     * @param encoded - 编码的证明
     * @returns 格式化的证明
     */
    decodeProof(encoded: Uint8Array): FormattedProof {
        const jsonString = new TextDecoder().decode(encoded);
        const parsed = JSON.parse(jsonString);

        return {
            pi_a: parsed.pi_a.map((x: string) => BigInt(x)),
            pi_b: parsed.pi_b.map((row: string[]) => row.map((x: string) => BigInt(x))),
            pi_c: parsed.pi_c.map((x: string) => BigInt(x))
        };
    }
}

/**
 * 格式化的证明
 */
export interface FormattedProof {
    pi_a: [bigint, bigint];
    pi_b: [[bigint, bigint], [bigint, bigint]];
    pi_c: [bigint, bigint];
}

/**
 * 证明结果
 */
export interface ProofResult {
    proof: FormattedProof;
    publicInputs: bigint[];
}

/**
 * 创建Average电路的证明生成器
 */
export function createAverageProver(circuitsDir?: string): ZKProver {
    return new ZKProver('average', circuitsDir);
}

/**
 * 创建Threshold电路的证明生成器
 */
export function createThresholdProver(circuitsDir?: string): ZKProver {
    return new ZKProver('threshold', circuitsDir);
}

/**
 * 便捷函数：生成平均值证明
 *
 * @param data - 数据数组
 * @param masks - 掩码数组
 * @returns 证明结果
 */
export async function generateAverageProof(
    data: bigint[],
    masks: bigint[]
): Promise<ProofResult> {
    const prover = createAverageProver();
    return await prover.generateProof({ data, masks });
}

/**
 * 便捷函数：生成阈值查询证明
 *
 * @param data - 数据数组
 * @param threshold - 阈值
 * @param salt - 盐值
 * @returns 证明结果
 */
export async function generateThresholdProof(
    data: bigint[],
    threshold: bigint,
    salt: bigint
): Promise<ProofResult> {
    const prover = createThresholdProver();
    return await prover.generateProof({ data, threshold, salt });
}
