# Portal Market Authentication Instructions

## 🎯 Goal
Authenticate Pyrogram session to enable Portal Market price lookups in your bot.

## 📋 Steps

### Step 1: Run the Authentication Script

Open a terminal and run:

```bash
cd /home/yousefmsm1/Desktop/gifts
source venv/bin/activate
python auth_portals.py
```

### Step 2: Enter Your Phone Number

When prompted, enter your phone number in international format:
- Example: `+1234567890`
- Include country code (the `+` sign)

### Step 3: Enter the Verification Code

After entering your phone number:
- You'll receive a verification code via Telegram
- Enter the code when prompted
- If you have 2FA enabled, you'll also need to enter your password

### Step 4: Verification

The script will:
- ✅ Generate Portal Market authData
- ✅ Test the connection
- ✅ Save authentication for future use

### Step 5: Start the Bot

After authentication completes:

```bash
cd /home/yousefmsm1/Desktop/gifts
source venv/bin/activate
python bot.py
```

## ✅ What You'll Get

Once authenticated, your bot will show:
- All existing gift details (NFT traits, rarity, supply)
- **Portal Market floor prices** for each gift

## 🔄 One-Time Process

You only need to authenticate ONCE. The session will be saved and used automatically in the future.

## ❗ Troubleshooting

If you get "EOF when reading a line":
- Make sure you're running in an **interactive terminal**
- Don't run the auth script in the background
- Don't pipe input/output

