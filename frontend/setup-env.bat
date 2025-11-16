@echo off
REM HydraProtocol Frontend Environment Setup Script (Windows)
REM 前端环境配置脚本 (Windows)

echo 🔧 Setting up HydraProtocol Frontend Environment...
echo.

REM Create .env.local file
(
echo # Sui Network Configuration
echo NEXT_PUBLIC_SUI_NETWORK=testnet
echo.
echo # HydraProtocol Smart Contract Addresses ^(deployed on Sui Testnet^)
echo NEXT_PUBLIC_PACKAGE_ID=0x2716ea3a391ca6e8cc5f2d0a7dc99f6186990c04dad0274b29bf5a93600fa2c6
echo NEXT_PUBLIC_DATA_REGISTRY_ID=0x0bb7375d29902c06253100f0ddc298d582fd41b7cd0e7b9e0271dd4a767c2707
echo NEXT_PUBLIC_MARKETPLACE_ID=0x29b8127932ba0467c3a2511a0ee95cecbd1dfc388622835880b6454c3ad02201
echo NEXT_PUBLIC_ZKP_REGISTRY_ID=0x7e05c6cb6c0ffa398b8b21ae8ab87b985e17af03895ff48dcf7099be32d26e41
echo.
echo # Walrus Storage Configuration
echo NEXT_PUBLIC_WALRUS_NETWORK=testnet
echo NEXT_PUBLIC_WALRUS_RPC_URL=https://walrus-testnet-rpc.sui.io
) > .env.local

echo ✅ Created .env.local with contract addresses
echo.

REM Verify circuit files exist
echo 🔍 Checking circuit files...
if exist "public\circuits\average" (
    if exist "public\circuits\threshold" (
        echo ✅ Circuit files found in public\circuits\
    ) else (
        goto copy_circuits
    )
) else (
    goto copy_circuits
)
goto check_modules

:copy_circuits
echo ⚠️  Circuit files not found. Attempting to copy from ..\circuits\build\
if not exist "public\circuits" mkdir "public\circuits"
if exist "..\circuits\build\average" (
    xcopy /E /I "..\circuits\build\average" "public\circuits\average"
    xcopy /E /I "..\circuits\build\threshold" "public\circuits\threshold"
    echo ✅ Circuit files copied successfully
) else (
    echo ❌ Circuit files not found in ..\circuits\build\
    echo    Please build circuits first: cd ..\circuits ^&^& npm run build
)
echo.

:check_modules
REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)
echo.

echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Start dev server: npm run dev
echo 2. Open browser: http://localhost:3000
echo 3. Connect Suiet Wallet ^(switch to Testnet^)
echo 4. Get testnet SUI: https://faucet.testnet.sui.io
echo.
echo 📚 For detailed instructions, see: SETUP_FIX.md
pause

