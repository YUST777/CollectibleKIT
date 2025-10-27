# The Problem

The code you provided uses `GetUserStarGiftsRequest` which **does not exist** in current Telethon or Pyrogram.

This method is from a newer Telegram layer that hasn't been added to public libraries yet.

## Solutions

### Option 1: Wait for Library Update
Wait for Telethon/Pyrogram to add support for this method

### Option 2: Use Marketplace APIs
The NFT Gift Calculator bot uses Tonnel and Portals marketplace APIs, not Telegram's direct API

### Option 3: Contact the Bot Developer
Ask @giftinfobot for their source code or API access

### Option 4: Reverse Engineer
1. Intercept their bot's network traffic
2. See which APIs they call
3. Replicate those calls

The bot you showed works because it uses BLOCKCHAIN marketplace data, not Telegram's internal gifts API.

