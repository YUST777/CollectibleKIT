Setup & Run

1) Create venv (recommended)
   python3 -m venv .venv
   source .venv/bin/activate

2) Install deps
   pip install -r requirements.txt

3) Configure (optional; defaults already set from your request)
   export TELEGRAM_BOT_TOKEN="<token>"
   export ALLOWED_USER_ID="800092886"

4) Run
   python -m bot.telegram_bot

Usage
- Send /start in private chat
- Send a photo or image file -> bot replies with 12 story images (1080x1920)

Notes
- Only private chat is processed and only user 800092886 is allowed.

