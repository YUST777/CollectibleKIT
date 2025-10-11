import os

# IMPORTANT: Do not hardcode secrets in production. Here we use an env var with
# a fallback to ease local testing. You provided the token explicitly.
BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "7367269425:AAElkm0afRKClK1TRrm7Z1G7O6-YAbXeado",
)

# Bot is now public - anyone can use it
# ALLOWED_USER_ID = int(os.getenv("ALLOWED_USER_ID", "800092886"))

# Mini App configuration
MINI_APP_URL = os.getenv("MINI_APP_URL", "https://47e9b5420ca4.ngrok-free.app")  # ngrok URL for testing

