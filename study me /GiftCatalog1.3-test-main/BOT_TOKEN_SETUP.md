# Bot Token Setup Guide

## Environment Variables

The application uses the following environment variables for Telegram bot integration:

- `TELEGRAM_BOT_TOKEN`: The main token used by the application
- `BOT_TOKEN`: Fallback token (for backward compatibility)

## Development vs Production

- In **development mode** (`NODE_ENV=development`), the application bypasses actual Telegram API calls
- In **production mode** (`NODE_ENV=production`), real API calls are made to verify channel membership

## Setup Instructions

1. Set your Telegram bot token in the `.env` file as `TELEGRAM_BOT_TOKEN`
2. For testing the app without API calls, keep `NODE_ENV=development`
3. To test actual API integration, set `NODE_ENV=production`

## Troubleshooting

If you encounter issues with channel verification:

1. Check that your bot token is correct
2. Ensure your bot has admin privileges in the channels
3. Verify that the channel IDs in the code match your actual Telegram channels 