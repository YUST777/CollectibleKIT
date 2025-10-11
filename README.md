# Story Canvas Cutter - Telegram Mini App

A Telegram Mini App that cuts photos into story pieces for easy sharing on Telegram Stories.

## Features

- 📸 Photo upload and processing
- ✂️ Automatic 4x3 grid cutting
- 📱 Native Telegram story sharing
- 💎 Premium subscriptions with TON payments
- 🎨 Custom watermarks for premium users
- 📊 User statistics and task system
- 🔗 Promotion tools

## Deployment

### Frontend (Netlify)
The `webapp/` directory contains the static Mini App that can be deployed to Netlify.

### Backend (Railway/Heroku)
The Flask API (`webapp_api.py`) needs to be deployed separately to a service that supports Python:
- Railway (recommended)
- Heroku
- Render
- DigitalOcean App Platform

## Setup

1. Deploy frontend to Netlify
2. Deploy backend API to Railway/Heroku
3. Update bot config with new URLs
4. Configure environment variables

## Files Structure

```
├── webapp/              # Frontend (Netlify)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── assets/
│   └── tonconnect-manifest.json
├── webapp_api.py        # Backend API
├── bot/                 # Telegram bot
├── netlify.toml         # Netlify config
└── requirements.txt     # Python dependencies
```
