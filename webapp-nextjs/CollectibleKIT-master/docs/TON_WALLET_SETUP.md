# TON Wallet Setup for Withdrawals

This guide explains how to set up real TON blockchain withdrawals for your bot.

## 🔐 Prerequisites

You need a TON wallet with:
1. **TON balance** (to send withdrawals and pay gas fees)
2. **24-word mnemonic phrase** (seed phrase) of the wallet

## 📝 Step 1: Create or Use Existing TON Wallet

### Option A: Create New Wallet (Recommended)
1. Download **Tonkeeper** app: https://tonkeeper.com
2. Create a new wallet
3. **IMPORTANT**: Write down the 24-word mnemonic phrase securely
4. Send some TON to this wallet (for withdrawals + gas fees)

### Option B: Use Existing Wallet
If you have an existing TON wallet:
1. Export the mnemonic from your wallet app
2. **IMPORTANT**: Only use a dedicated bot wallet (not your personal wallet)

## ⚙️ Step 2: Configure Environment Variable

Set the mnemonic as an environment variable:

```bash
export TON_WALLET_MNEMONIC="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20 word21 word22 word23 word24"
```

Or add it to your `.env` file (create if doesn't exist):

```
TON_WALLET_MNEMONIC=word1 word2 word3 ... word24
```

## 🚀 Step 3: Test the Setup

1. Add some test TON balance to your account in the database
2. Connect your Tonkeeper wallet in the Mini App
3. Try withdrawing 0.1 TON
4. Check the console logs for transaction details
5. Verify the TON arrived in your wallet

## 🔍 How It Works

### Withdrawal Flow:

1. **User clicks "Withdraw"** in Mini App
2. **Frontend** gets user's connected wallet address from TON Connect
3. **Backend** (`webapp_api.py`):
   - Validates user has sufficient balance
   - Uses bot's wallet (from mnemonic) to send TON
   - Sends transaction to TON blockchain
   - Records transaction hash in database
   - Updates user's balance to 0
4. **User receives TON** in their wallet (usually within 5-10 seconds)
5. **Transaction viewable** on TON Explorer

### Files Involved:

- **`bot/ton_wallet.py`**: TON wallet service (sends blockchain transactions)
- **`bot/config.py`**: Configuration (mnemonic storage)
- **`webapp_api.py`**: Withdrawal API endpoint
- **`webapp/app.js`**: Frontend withdrawal logic

## 💰 Gas Fees

- Each withdrawal costs ~0.01 TON in gas fees
- The bot's wallet pays these fees
- **Make sure to keep enough TON** in the bot's wallet for gas

## 🔒 Security Notes

1. **Never commit** the mnemonic to Git
2. **Use environment variables** only
3. **Keep the mnemonic secure** - anyone with it can access the wallet
4. **Use a dedicated wallet** for the bot (not your personal wallet)
5. **Monitor the wallet balance** regularly

## 📊 Monitoring

Check bot wallet balance:
```python
from bot.ton_wallet import get_wallet_service
import asyncio

wallet_service = get_wallet_service()
asyncio.run(wallet_service.initialize())
balance = asyncio.run(wallet_service.get_balance())
print(f"Wallet balance: {balance} TON")
```

## 🐛 Troubleshooting

### "TON wallet mnemonic not set!"
- Set the `TON_WALLET_MNEMONIC` environment variable

### "Failed to send TON"
- Check bot wallet has sufficient balance
- Check mnemonic is correct (24 words)
- Check TON network is not congested

### "Wallet address required"
- User must connect TON wallet first
- Check TON Connect is working in frontend

## 🔗 Useful Links

- **TON Viewer** (Explorer): https://tonviewer.com
- **Tonkeeper Wallet**: https://tonkeeper.com
- **TON Documentation**: https://ton.org/docs
- **pytoniq Library**: https://github.com/yungwine/pytoniq

## 📝 Example Transaction

After successful withdrawal, you'll see:
```
Processing withdrawal: 0.1 TON to UQC9... for user 123456
✅ Withdrawal successful! TX: abc123..., New balance: 0
```

User can view transaction at:
```
https://tonviewer.com/transaction/abc123...
```




