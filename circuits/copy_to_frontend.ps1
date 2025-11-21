# 复制电路文件到前端 public 目录
# PowerShell 版本

Write-Host "📦 开始复制电路文件到前端..." -ForegroundColor Green

# 创建前端目录
$FRONTEND_DIR = "..\frontend\public\circuits"
New-Item -ItemType Directory -Force -Path "$FRONTEND_DIR\average" | Out-Null
New-Item -ItemType Directory -Force -Path "$FRONTEND_DIR\threshold" | Out-Null
New-Item -ItemType Directory -Force -Path "$FRONTEND_DIR\batch_average" | Out-Null
New-Item -ItemType Directory -Force -Path "$FRONTEND_DIR\aggregation" | Out-Null
New-Item -ItemType Directory -Force -Path "$FRONTEND_DIR\batch_threshold" | Out-Null
New-Item -ItemType Directory -Force -Path "$FRONTEND_DIR\threshold_aggregation" | Out-Null

# 复制旧版电路（保持兼容）
Write-Host "📁 复制 average 电路..." -ForegroundColor Cyan
Copy-Item "build\average\average_js\average.wasm" "$FRONTEND_DIR\average\" -Force
Copy-Item "build\average\circuit_final.zkey" "$FRONTEND_DIR\average\" -Force
Copy-Item "build\average\verification_key.json" "$FRONTEND_DIR\average\" -Force

Write-Host "📁 复制 threshold 电路..." -ForegroundColor Cyan
Copy-Item "build\threshold\threshold_js\threshold.wasm" "$FRONTEND_DIR\threshold\" -Force
Copy-Item "build\threshold\circuit_final.zkey" "$FRONTEND_DIR\threshold\" -Force
Copy-Item "build\threshold\verification_key.json" "$FRONTEND_DIR\threshold\" -Force

# 复制新版批次电路
Write-Host "📁 复制 batch_average 电路..." -ForegroundColor Cyan
Copy-Item "build\batch_average\batch_average_js\batch_average.wasm" "$FRONTEND_DIR\batch_average\" -Force
Copy-Item "build\batch_average\circuit_final.zkey" "$FRONTEND_DIR\batch_average\" -Force
Copy-Item "build\batch_average\verification_key.json" "$FRONTEND_DIR\batch_average\" -Force

Write-Host "📁 复制 aggregation 电路..." -ForegroundColor Cyan
Copy-Item "build\aggregation\aggregation_js\aggregation.wasm" "$FRONTEND_DIR\aggregation\" -Force
Copy-Item "build\aggregation\circuit_final.zkey" "$FRONTEND_DIR\aggregation\" -Force
Copy-Item "build\aggregation\verification_key.json" "$FRONTEND_DIR\aggregation\" -Force

Write-Host "📁 复制 batch_threshold 电路..." -ForegroundColor Cyan
Copy-Item "build\batch_threshold\batch_threshold_js\batch_threshold.wasm" "$FRONTEND_DIR\batch_threshold\" -Force
Copy-Item "build\batch_threshold\circuit_final.zkey" "$FRONTEND_DIR\batch_threshold\" -Force
Copy-Item "build\batch_threshold\verification_key.json" "$FRONTEND_DIR\batch_threshold\" -Force

Write-Host "📁 复制 threshold_aggregation 电路..." -ForegroundColor Cyan
Copy-Item "build\threshold_aggregation\threshold_aggregation_js\threshold_aggregation.wasm" "$FRONTEND_DIR\threshold_aggregation\" -Force
Copy-Item "build\threshold_aggregation\circuit_final.zkey" "$FRONTEND_DIR\threshold_aggregation\" -Force
Copy-Item "build\threshold_aggregation\verification_key.json" "$FRONTEND_DIR\threshold_aggregation\" -Force

Write-Host ""
Write-Host "✅ 所有电路文件已复制到前端！" -ForegroundColor Green
Write-Host ""
Write-Host "💡 下一步:" -ForegroundColor Yellow
Write-Host "   1. 检查前端 public/circuits 目录"
Write-Host "   2. 启动前端测试批次计算功能"
