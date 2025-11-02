# 🎯 SIMPLE EXPLANATION

## What's the problem?
When you use /portfolio command, the bot needs to login to stickerdom.store API.
To login, it needs something called "initData" (like a password).

## Why doesn't it work?
The bot doesn't have this "initData" yet, so it can't login.

## 🛠️ How to Fix - Choose ONE:

### METHOD 1: Get initData manually (EASIEST - 2 minutes)
1. Open your browser
2. Go to: https://stickerdom.store
3. Open browser Developer Tools (F12)
4. Go to Network tab
5. Refresh the page
6. Look for requests to "api.stickerdom.store/api/v1/auth"
7. Find the "initData" in the request
8. Copy it
9. Add this line to your .env file:
   MANUAL_INIT_DATA=paste_your_initdata_here
10. Restart bot

### METHOD 2: Setup auto-refresh (ONE TIME - 5 minutes)
Run this command:
   python3 setup_telethon_session.py

It will ask for your phone number, then it will work forever!
