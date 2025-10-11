@echo off
echo Starting Telegram Bot...
echo.

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo Virtual environment not found. Creating one...
    python -m venv .venv
    echo Virtual environment created.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install requirements if needed
echo Installing requirements...
pip install -r requirements.txt

REM Start the bot
echo Starting bot...
python -m bot.telegram_bot

pause
