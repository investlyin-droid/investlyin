# Payment Accounts Configuration Script for PowerShell
# 
# This script configures crypto wallet addresses for the trading platform.
# 
# Usage:
#   1. Get your admin JWT token from the admin login
#   2. Set it as an environment variable: $env:ADMIN_TOKEN = "your_token_here"
#   3. Run: .\configure-payment-accounts.ps1

$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3001" }
$ADMIN_TOKEN = $env:ADMIN_TOKEN

if (-not $ADMIN_TOKEN) {
    Write-Host "⚠️  ADMIN_TOKEN not set!" -ForegroundColor Yellow
    Write-Host "Please set it first: `$env:ADMIN_TOKEN = 'your_admin_jwt_token'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or provide it when running:" -ForegroundColor Yellow
    Write-Host "  `$env:ADMIN_TOKEN = 'your_token'; .\configure-payment-accounts.ps1" -ForegroundColor Yellow
    exit 1
}

$config = @{
    cryptoAddresses = @{
        TRON = "TJJwio3cDnPFf214nCfHc7wCskfmJpf1Pr"
        USDT_TRC20 = "TJJwio3cDnPFf214nCfHc7wCskfmJpf1Pr"
        BTC = "bc1qy4dl4rz9twxzhgvm4qOc7a56xdmnz6f6mt5le6"
        SOLANA = "By9qdy3EtEaxTLdMXNU1B7v5PiamkXL4aBjvfUJW1"
        LINEA = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
        ARBITRUM = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
        BNB = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
        BASE = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
        POLYGON = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
        ETH = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
        USDT_ERC20 = "0xf65095068d92161BE75AffE85402ad9E78AC4719"
    }
}

Write-Host "Configuring payment accounts..." -ForegroundColor Cyan
Write-Host "API URL: $API_URL" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $ADMIN_TOKEN"
    "Content-Type" = "application/json"
}

$body = $config | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "$API_URL/admin/payment-config" `
        -Method PUT `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Configuration successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configured addresses:" -ForegroundColor Cyan
    $config.cryptoAddresses.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Configuration failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Backend server is running on $API_URL" -ForegroundColor Yellow
    Write-Host "  2. Admin token is valid" -ForegroundColor Yellow
    Write-Host "  3. You have admin/super_admin role" -ForegroundColor Yellow
    exit 1
}
