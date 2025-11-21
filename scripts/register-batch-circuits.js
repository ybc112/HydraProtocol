/**
 * 注册批次电路的 Verification Keys 到链上
 * 
 * 使用方法：
 * 1. 设置环境变量 PRIVATE_KEY
 * 2. 运行: node register-batch-circuits.js
 */

const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { SuiClient } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const fs = require('fs');
const path = require('path');

// 配置
const NETWORK = 'testnet';
const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const PACKAGE_ID = '0xc06de3e29a173a088c5b5f75632e2ef67e9ab1d09e65336589a514d79f1b010d';
const ZKP_REGISTRY_ID = '0x2a5e682613f69ffec125e7accf407abdc11b8289f4d298c019b595466ab698cb';

// 电路配置
const CIRCUITS = [
  {
    name: 'batch_average',
    displayName: 'Batch Average (100 data points)',
    vkPath: '../circuits/build/batch_average/verification_key.json'
  },
  {
    name: 'aggregation',
    displayName: 'Aggregation (up to 100 batches)',
    vkPath: '../circuits/build/aggregation/verification_key.json'
  },
  {
    name: 'batch_threshold',
    displayName: 'Batch Threshold (100 data points)',
    vkPath: '../circuits/build/batch_threshold/verification_key.json'
  },
  {
    name: 'threshold_aggregation',
    displayName: 'Threshold Aggregation (up to 100 batches)',
    vkPath: '../circuits/build/threshold_aggregation/verification_key.json'
  }
];

async function main() {
  // 检查私钥
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ 请设置环境变量 PRIVATE_KEY');
    console.error('   export PRIVATE_KEY=suiprivkey1...');
    process.exit(1);
  }

  // 初始化客户端
  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const client = new SuiClient({ url: RPC_URL });
  const sender = keypair.getPublicKey().toSuiAddress();

  console.log('🔐 发送者地址:', sender);
  console.log('🌐 网络:', NETWORK);
  console.log('📦 Package ID:', PACKAGE_ID);
  console.log('📋 ZKP Registry ID:', ZKP_REGISTRY_ID);
  console.log('');

  // 注册每个电路
  for (const circuit of CIRCUITS) {
    console.log(`\n🔑 注册电路: ${circuit.displayName}`);
    console.log(`   电路名称: ${circuit.name}`);

    try {
      // 读取 verification key
      const vkPath = path.resolve(__dirname, circuit.vkPath);
      if (!fs.existsSync(vkPath)) {
        console.error(`   ❌ 找不到文件: ${vkPath}`);
        continue;
      }

      const vkData = JSON.parse(fs.readFileSync(vkPath, 'utf-8'));
      console.log(`   ✅ 读取 VK 文件成功`);

      // 将 VK 转换为字节数组
      const vkBytes = Buffer.from(JSON.stringify(vkData));
      console.log(`   📊 VK 大小: ${vkBytes.length} bytes`);

      // 创建交易
      const tx = new Transaction();
      
      // 调用 register_circuit 函数
      tx.moveCall({
        target: `${PACKAGE_ID}::zkp_verifier::register_circuit`,
        arguments: [
          tx.object(ZKP_REGISTRY_ID),
          tx.pure.string(circuit.name),
          tx.pure.vector('u8', Array.from(vkBytes))
        ]
      });

      // 执行交易
      console.log(`   🚀 提交交易...`);
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true
        }
      });

      console.log(`   ✅ 交易成功!`);
      console.log(`   📝 Digest: ${result.digest}`);

      // 查找创建的 VK 对象
      const createdObjects = result.objectChanges?.filter(
        change => change.type === 'created'
      );

      if (createdObjects && createdObjects.length > 0) {
        const vkObject = createdObjects.find(obj => 
          obj.objectType?.includes('VerificationKey')
        );
        
        if (vkObject) {
          console.log(`   🎯 VK Object ID: ${vkObject.objectId}`);
          console.log(`   💾 请保存此 ID，前端需要使用！`);
        }
      }

    } catch (error) {
      console.error(`   ❌ 注册失败:`, error.message);
    }
  }

  console.log('\n✅ 所有电路注册完成！');
  console.log('\n📝 请将上面的 VK Object IDs 保存到配置文件中');
}

main().catch(console.error);
