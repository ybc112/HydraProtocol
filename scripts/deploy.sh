#!/bin/bash

# HydraProtocol 合约部署脚本

set -e  # 遇到错误立即退出

echo "======================================"
echo "  HydraProtocol 合约部署脚本"
echo "======================================"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Sui CLI是否安装
if ! command -v sui &> /dev/null; then
    echo -e "${RED}错误: 未找到sui命令，请先安装Sui CLI${NC}"
    echo "安装命令: curl https://sui.io/install.sh | sh"
    exit 1
fi

echo -e "${BLUE}[1/6] 检查Sui CLI版本...${NC}"
sui --version

# 检查当前网络
echo -e "${BLUE}[2/6] 检查当前网络...${NC}"
CURRENT_ENV=$(sui client active-env)
echo "当前网络: $CURRENT_ENV"

# 如果不是testnet，询问是否切换
if [ "$CURRENT_ENV" != "testnet" ]; then
    echo -e "${RED}警告: 当前不在testnet网络${NC}"
    read -p "是否切换到testnet? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sui client switch --env testnet
        echo -e "${GREEN}已切换到testnet${NC}"
    else
        echo "继续在 $CURRENT_ENV 部署"
    fi
fi

# 检查账户余额
echo -e "${BLUE}[3/6] 检查账户余额...${NC}"
BALANCE=$(sui client gas --json | grep -o '"balance":[0-9]*' | head -1 | grep -o '[0-9]*')
if [ -z "$BALANCE" ]; then
    BALANCE=0
fi

BALANCE_SUI=$((BALANCE / 1000000000))
echo "当前余额: $BALANCE_SUI SUI"

if [ $BALANCE_SUI -lt 1 ]; then
    echo -e "${RED}余额不足！需要至少1 SUI用于部署${NC}"
    read -p "是否从水龙头获取测试币? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "请求测试币..."
        sui client faucet
        sleep 5
        echo -e "${GREEN}已获取测试币${NC}"
    else
        echo "部署需要足够的SUI代币，请先获取"
        exit 1
    fi
fi

# 编译合约
echo -e "${BLUE}[4/6] 编译合约...${NC}"
cd contracts
sui move build

if [ $? -ne 0 ]; then
    echo -e "${RED}编译失败！请检查合约代码${NC}"
    exit 1
fi

echo -e "${GREEN}编译成功！${NC}"

# 运行测试
echo -e "${BLUE}[5/6] 运行测试...${NC}"
read -p "是否运行测试? (推荐) (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sui move test
    if [ $? -ne 0 ]; then
        echo -e "${RED}测试失败！${NC}"
        read -p "是否继续部署? (不推荐) (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}所有测试通过！${NC}"
    fi
fi

# 部署合约
echo -e "${BLUE}[6/6] 部署合约到 $CURRENT_ENV...${NC}"
echo "这可能需要几秒钟..."

DEPLOY_OUTPUT=$(sui client publish --gas-budget 100000000 2>&1)
echo "$DEPLOY_OUTPUT"

# 提取重要信息
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep -o "PackageID: 0x[a-f0-9]*" | head -1 | cut -d' ' -f2)
REGISTRY_ID=$(echo "$DEPLOY_OUTPUT" | grep -A 5 "DataRegistry" | grep -o "ObjectID: 0x[a-f0-9]*" | cut -d' ' -f2)

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}部署失败！无法提取Package ID${NC}"
    exit 1
fi

# 保存部署信息
echo -e "${GREEN}======================================"
echo "       部署成功！"
echo "======================================${NC}"
echo ""
echo "Package ID: $PACKAGE_ID"
echo "DataRegistry ID: $REGISTRY_ID"
echo ""

# 保存到配置文件
DEPLOY_INFO_FILE="../deployed_addresses.json"
cat > $DEPLOY_INFO_FILE <<EOF
{
  "network": "$CURRENT_ENV",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "package_id": "$PACKAGE_ID",
  "registry_id": "$REGISTRY_ID"
}
EOF

echo -e "${GREEN}部署信息已保存到: $DEPLOY_INFO_FILE${NC}"

# 打印使用说明
echo ""
echo "======================================"
echo "         下一步操作"
echo "======================================"
echo ""
echo "1. 查看合约对象:"
echo "   sui client object $PACKAGE_ID"
echo ""
echo "2. 注册第一条数据:"
echo "   sui client call \\"
echo "     --package $PACKAGE_ID \\"
echo "     --module data_registry \\"
echo "     --function register_data \\"
echo "     --args $REGISTRY_ID \"blob_test\" \"[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]\" 1024 \"test\" \"Test data\" true false 0x6 \\"
echo "     --gas-budget 10000000"
echo ""
echo "3. 在Sui Explorer查看:"
echo "   https://suiexplorer.com/object/$PACKAGE_ID?network=$CURRENT_ENV"
echo ""
echo -e "${GREEN}祝你黑客松顺利！🚀${NC}"

cd ..


