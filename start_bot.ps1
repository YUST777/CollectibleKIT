# PowerShell script to start Telegram Bot
Write-Host "Starting Telegram Bot..." -ForegroundColor Green
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv .venv
    Write-Host "Virtual environment created." -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& .venv\Scripts\Activate.ps1

# Install requirements if needed
Write-Host "Installing requirements..." -ForegroundColor Cyan
pip install -r requirements.txt

# Start the bot
Write-Host "Starting bot..." -ForegroundColor Green
python -m bot.telegram_bot

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
