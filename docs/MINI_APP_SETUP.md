# 🎨 Telegram Mini App Setup Guide

This guide will help you deploy your Story Puzzle Cutter Mini App.

## 📁 Project Structure

```
cut it 0.1/
├── webapp/                    # Mini App frontend
│   ├── index.html            # Main HTML file
│   ├── styles.css            # Native Telegram theming
│   └── app.js                # Mini App JavaScript
├── webapp_api.py             # Flask API server
├── bot/                      # Existing bot code
└── start_mini_app.py         # Combined startup script
```

## 🚀 Quick Start (Local Development)

1. **Start the services:**
   ```bash
   python start_mini_app.py
   ```

2. **Test locally:**
   - Bot runs as usual
   - API server runs on `http://localhost:5000`
   - Mini App accessible at `http://localhost:5000`

## 🌐 Production Deployment

### Option 1: Heroku (Recommended)

1. **Create Heroku app:**
   ```bash
   heroku create your-story-bot-app
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN="your_bot_token"
   heroku config:set MINI_APP_URL="https://your-story-bot-app.herokuapp.com"
   ```

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Add Mini App"
   git push heroku main
   ```

### Option 2: VPS/Dedicated Server

1. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install nginx python3 python3-pip
   ```

2. **Setup reverse proxy (nginx):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Setup systemd service:**
   ```bash
   sudo cp mini_app.service /etc/systemd/system/
   sudo systemctl enable mini_app.service
   sudo systemctl start mini_app.service
   ```

## 🔧 Configuration

### Bot Configuration

Update `bot/config.py`:
```python
MINI_APP_URL = "https://your-domain.com"  # Your actual domain
```

### Environment Variables

```bash
# Required
TELEGRAM_BOT_TOKEN="your_bot_token"

# Optional
MINI_APP_URL="https://your-domain.com"
API_HOST="0.0.0.0"
API_PORT="5000"
DEBUG="False"
```

## 📱 BotFather Setup

1. **Open BotFather:** [@BotFather](https://t.me/botfather)

2. **Set up Mini App:**
   ```
   /mybots
   → Select your bot
   → Bot Settings
   → Menu Button
   → Configure Menu Button
   → Send URL: https://your-domain.com
   ```

3. **Alternative - Inline Button:**
   The bot already includes a Mini App button in the start message.

## 🎨 Mini App Features

### ✅ What it does:
- **Native Telegram UI** - Uses Telegram's color scheme
- **Photo Upload** - Drag & drop or file picker
- **Image Processing** - Uses your existing Python code
- **Story Preview** - Shows all 12 pieces in a grid
- **One-by-one Sending** - Click to send each piece
- **Progress Tracking** - Visual feedback for sent pieces

### 🔄 User Flow:
1. User opens Mini App from bot
2. Uploads photo (drag & drop or file picker)
3. Sees preview of their image
4. Clicks "Cut into Stories"
5. Sees grid of 12 story pieces
6. Clicks each piece to send it to bot chat
7. Bot provides instructions for posting

## 🛠️ Development

### Local Testing:
```bash
# Start API server
python webapp_api.py

# In another terminal, start bot
python -m bot.telegram_bot

# Test Mini App at: http://localhost:5000
```

### API Endpoints:
- `GET /` - Mini App interface
- `POST /api/process-image` - Process uploaded image
- `GET /api/health` - Health check

## 🔍 Troubleshooting

### Common Issues:

1. **Mini App not loading:**
   - Check HTTPS (required for production)
   - Verify domain in BotFather
   - Check browser console for errors

2. **Image processing fails:**
   - Check file size (max 10MB)
   - Verify file format (PNG, JPG, JPEG, GIF, WebP)
   - Check API server logs

3. **Bot not receiving data:**
   - Verify web app data handler is registered
   - Check bot logs for errors
   - Ensure proper JSON format from Mini App

### Debug Mode:
```bash
export DEBUG=True
python webapp_api.py
```

## 📊 Analytics

The Mini App interactions are tracked in your existing database:
- `mini_app_story_sent` - When user sends a story piece
- User statistics include Mini App usage

## 🔒 Security Notes

- HTTPS required for production
- File size limits (10MB max)
- File type validation
- User data sanitization
- CORS enabled for Mini App

## 🎯 Next Steps

1. Deploy to your preferred platform
2. Update `MINI_APP_URL` in config
3. Configure BotFather
4. Test with real users
5. Monitor analytics and feedback

## 📞 Support

If you encounter issues:
1. Check the logs
2. Verify configuration
3. Test locally first
4. Check Telegram Bot API documentation

---

**Ready to launch your Mini App! 🚀**



