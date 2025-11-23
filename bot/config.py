import os

# IMPORTANT: Do not hardcode secrets in production. Here we use an env var with
# a fallback to ease local testing. You provided the token explicitly.
# CollectibleKIT Bot: @CollectibleKITbot
BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "8151264433:AAG92vbSyL6TKyP1kBxfG6WQfYoz0Jy9df0",
)

# Bot is now public - anyone can use it
# ALLOWED_USER_ID = int(os.getenv("ALLOWED_USER_ID", "800092886"))

# Mini App configuration
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://collectablekit.01studio.xyz")

# TON Wallet configuration
# IMPORTANT: Set this environment variable with your bot's TON wallet mnemonic (24 words)
# Example: export TON_WALLET_MNEMONIC="word1 word2 word3 ... word24"
# Get a wallet at: https://tonkeeper.com or https://wallet.ton.org
TON_WALLET_MNEMONIC = os.getenv("TON_WALLET_MNEMONIC", "")

