# Creating Real Marketplace Listings

This guide shows you how to create real data listings on Sui testnet that your frontend can display.

## Quick Start

```bash
cd scripts
npm install
npm run create-listings
```

## What This Does

The script will:
1. Connect to Sui testnet
2. Register 4 sample datasets (medical, clinical, defi, logistics)
3. List them on the marketplace with prices
4. Output the created listing IDs

## Prerequisites

### 1. Get Testnet SUI

You need at least 1 SUI in your wallet. Get it from:

**Option A: Discord Faucet**
- Join Sui Discord: https://discord.gg/sui
- Go to #testnet-faucet channel
- Request tokens for your address

**Option B: CLI Faucet**
```bash
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "YOUR_ADDRESS_HERE"
    }
  }'
```

### 2. Configure Wallet

The script will automatically use your Sui CLI wallet if installed:
```bash
# Install Sui CLI if needed
curl https://sui.io/install.sh | sh

# Create a new address
sui client new-address ed25519

# Check your address
sui client active-address
```

## After Running

Once listings are created:

1. **Refresh Frontend**: The marketplace will automatically query for new listings
2. **Check Console**: Look for "Found X DataListed events" in browser console
3. **Purchase**: Connect your Sui wallet and purchase data access

## Troubleshooting

### "No keys in keystore"
- Run `sui client new-address ed25519` to create a wallet first

### "Low balance"
- Get testnet SUI from faucet (see above)

### "Transaction failed"
- Check that contract addresses in the script match your deployed contracts
- Verify you're on testnet: `sui client active-env`

## Contract Addresses

Current testnet deployment:
```
packageId:       0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6
dataRegistryId:  0x0bb7375d29902c06253100f0ddc298d582fd41b7cd0e7b9e0271dd4a767c2707
marketplaceId:   0x29b8127932ba0467c3a2511a0ee95cecbd1dfc388622835880b6454c3ad02201
```

## Sample Data Created

The script creates 4 listings:

1. **Hospital Patient Recovery Data** (Healthcare) - 100 SUI
2. **Clinical Trial Results** (Healthcare) - 250 SUI
3. **DeFi Transaction Patterns** (Finance) - 75 SUI
4. **Supply Chain Logistics** (Logistics) - 150 SUI

All data is encrypted and stored with mock Walrus Blob IDs.
