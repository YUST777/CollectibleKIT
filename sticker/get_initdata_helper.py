#!/usr/bin/env python3
"""
Helper script to get initData from Telegram WebApp
Run this from within a Telegram Mini App browser console
"""

print("""
To get initData from Telegram WebApp:

1. Open Telegram Desktop/Web
2. Open your Mini App (e.g., stickerdom.com)
3. Press F12 to open Developer Tools
4. Go to Console tab
5. Run one of these commands:

Method 1 (Desktop/Web):
   window.Telegram.WebApp.initData

Method 2 (Mobile - if available):
   window.Telegram.WebApp.initDataUnsafe

Method 3 (Alternative):
   window.tg?.initData

After you get the initData string, save it to init_data.txt:
   echo "YOUR_INIT_DATA_STRING" > init_data.txt

OR use the automated service which will use Telethon to generate it.
""")

