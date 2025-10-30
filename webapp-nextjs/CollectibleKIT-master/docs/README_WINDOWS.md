# Telegram Story Puzzle Bot - Windows Setup

## 🪟 Windows Installation Guide

### Prerequisites
- **Python 3.8+** installed and added to PATH
- **Git** (optional, for cloning the repository)

### Quick Start (Recommended)

#### Option 1: Double-click Startup
1. **Download** the project files
2. **Double-click** `start_bot.bat` 
3. The script will automatically:
   - Create virtual environment
   - Install dependencies
   - Start the bot

#### Option 2: PowerShell
1. **Right-click** `start_bot.ps1`
2. **Select** "Run with PowerShell"
3. If prompted about execution policy, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

#### Option 3: Python Script
1. **Open Command Prompt** in the project folder
2. **Run**: `python start_bot.py`

### Manual Setup

#### 1. Create Virtual Environment
```cmd
python -m venv .venv
```

#### 2. Activate Virtual Environment
```cmd
.venv\Scripts\activate
```

#### 3. Install Dependencies
```cmd
pip install -r requirements.txt
```

#### 4. Configure Bot
1. Edit `bot/config.py`
2. Add your bot token
3. Set your TON wallet address

#### 5. Start Bot
```cmd
python -m bot.telegram_bot
```

### File Structure
```
cut it/
├── bot/
│   ├── __init__.py
│   ├── config.py          # Bot configuration
│   ├── database.py        # Database operations
│   ├── payment.py         # Payment handling
│   ├── processing.py      # Image processing
│   └── telegram_bot.py    # Main bot logic
├── assets/                # Bot images
│   ├── start.jpg
│   ├── freeplan.jpg
│   ├── preuime .jpg
│   └── protip.jpg
├── start_bot.bat          # Windows batch file
├── start_bot.ps1          # PowerShell script
├── start_bot.py           # Cross-platform Python script
├── requirements.txt       # Python dependencies
└── README_WINDOWS.md      # This file
```

### Troubleshooting

#### Common Issues

**1. "python is not recognized"**
- Install Python from [python.org](https://python.org)
- Make sure to check "Add Python to PATH" during installation

**2. "pip is not recognized"**
- Python 3.4+ includes pip by default
- Try: `python -m pip install -r requirements.txt`

**3. Permission Errors**
- Run Command Prompt as Administrator
- Or use PowerShell with execution policy set

**4. Virtual Environment Issues**
- Delete `.venv` folder and recreate
- Use: `python -m venv .venv --clear`

**5. Pillow Installation Fails**
- Install Visual C++ Build Tools
- Or use: `pip install --only-binary=all Pillow`

### Bot Features
- ✅ **4x3 Image Cutting** - Creates 12 story pieces
- ✅ **Freemium Model** - 3 free cuts, paid packages
- ✅ **TON Payments** - Cryptocurrency payments
- ✅ **Watermarking** - Branded free cuts
- ✅ **Cross-platform** - Works on Windows, macOS, Linux
- ✅ **Auto-restart** - Recovers from crashes
- ✅ **Analytics** - Track usage and revenue

### Support
- Check logs in the terminal
- Ensure all dependencies are installed
- Verify bot token is correct
- Check TON wallet address format

### Security Notes
- Keep your bot token private
- Don't share your TON wallet private keys
- The bot only works in private chats
- All payments use secure randomized memos
