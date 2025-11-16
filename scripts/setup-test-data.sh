#!/usr/bin/env bash

# Quick script to create test listings
# This script will install dependencies and run the listing creation

echo "🚀 Setting up HydraProtocol Test Listings"
echo "=========================================="
echo ""

# Check if we're in the scripts directory
if [ ! -f "create-listings.ts" ]; then
    echo "❌ Error: Please run this from the scripts/ directory"
    echo "   cd scripts && ./setup-test-data.sh"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run the script
echo "📝 Creating test listings on Sui testnet..."
echo ""
npm run create-listings
