/**
 * SnarkJS 类型定义
 *
 * 由于 snarkjs 没有官方的 TypeScript 类型定义，
 * 我们手动定义需要的类型
 */

declare module 'snarkjs' {
    export namespace groth16 {
        export function fullProve(
            input: any,
            wasmFile: string,
            zkeyFile: string
        ): Promise<{
            proof: any;
            publicSignals: string[];
        }>;

        export function verify(
            vkey: any,
            publicSignals: string[],
            proof: any
        ): Promise<boolean>;
    }

    export namespace plonk {
        export function fullProve(
            input: any,
            wasmFile: string,
            zkeyFile: string
        ): Promise<{
            proof: any;
            publicSignals: string[];
        }>;

        export function verify(
            vkey: any,
            publicSignals: string[],
            proof: any
        ): Promise<boolean>;
    }

    export namespace zKey {
        export function exportVerificationKey(zkeyFile: string): Promise<any>;
    }

    export namespace r1cs {
        export function exportJson(r1csFile: string): Promise<any>;
    }
}
