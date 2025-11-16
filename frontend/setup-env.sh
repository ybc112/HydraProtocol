#!/bin/bash
# HydraProtocol Frontend Environment Setup Script
# 前端环境配置脚本

echo "🔧 Setting up HydraProtocol Frontend Environment..."
echo ""

# Create .env.local file
cat > .env.local << 'EOF'
# Sui Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet

# HydraProtocol Smart Contract Addresses (deployed on Sui Testnet)
NEXT_PUBLIC_PACKAGE_ID=0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6
NEXT_PUBLIC_DATA_REGISTRY_ID=0x0bb7375d29902c06253100f0ddc298d582fd41b7cd0e7b9e0271dd4a767c2707
NEXT_PUBLIC_MARKETPLACE_ID=0x29b8127932ba0467c3a2511a0ee95cecbd1dfc388622835880b6454c3ad02201
NEXT_PUBLIC_ZKP_REGISTRY_ID=0x7e05c6cb6c0ffa398b8b21ae8ab87b985e17af03895ff48dcf7099be32d26e41

# Walrus Storage Configuration
NEXT_PUBLIC_WALRUS_NETWORK=testnet
NEXT_PUBLIC_WALRUS_RPC_URL=https://walrus-testnet-rpc.sui.io
EOF

echo "✅ Created .env.local with contract addresses"
echo ""

# Verify circuit files exist
echo "🔍 Checking circuit files..."
if [ -d "public/circuits/average" ] && [ -d "public/circuits/threshold" ]; then
    echo "✅ Circuit files found in public/circuits/"
else
    echo "⚠️  Circuit files not found. Attempting to copy from ../circuits/build/"
    mkdir -p public/circuits
    if [ -d "../circuits/build/average" ]; then
        cp -r ../circuits/build/average public/circuits/
        cp -r ../circuits/build/threshold public/circuits/
        echo "✅ Circuit files copied successfully"
    else
        echo "❌ Circuit files not found in ../circuits/build/"
        echo "   Please build circuits first: cd ../circuits && npm run build"
    fi
fi
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start dev server: npm run dev"
echo "2. Open browser: http://localhost:3000"
echo "3. Connect Suiet Wallet (switch to Testnet)"
echo "4. Get testnet SUI: https://faucet.testnet.sui.io"
echo ""
echo "📚 For detailed instructions, see: SETUP_FIX.md"

