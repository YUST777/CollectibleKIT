# 📋 CollectibleKIT Deployment Guide

## ✅ Current Status

**Project Location:** `/root/01studio/CollectibleKIT/`

### Completed:
- ✅ Project cloned from GitHub
- ✅ Node.js and npm installed
- ✅ Dependencies installed (`npm install` completed)
- ✅ SSL certificate path ready: `/etc/letsencrypt/live/collectiblekit.01studio.xyz/`

### Pending:
- ⏳ DNS configuration in GoDaddy
- ⏳ SSL certificate (needs DNS first)
- ⏳ Next.js app build
- ⏳ HTTPS server deployment

---

## 🚀 Deployment Steps

### Step 1: Configure DNS in GoDaddy

Add this A record:

```
Type: A
Name: CollectibleKit
Value: 151.241.228.81
TTL: 3600 (1 hour)
```

Wait 5-30 minutes for DNS propagation, then verify:

```bash
getent hosts collectiblekit.01studio.xyz
# Should return: 151.241.228.81
```

### Step 2: Build Next.js App

```bash
cd /root/01studio/CollectibleKIT/webapp-nextjs
npm run build
```

### Step 3: Set up HTTPS Server

The app will run on port 3000 by default. To serve with HTTPS on port 443:

Option A: Using Node.js with SSL (similar to giftschart CDN)
Option B: Using Nginx reverse proxy
Option C: Using Coolify (already installed)

---

## 📁 Project Structure

```
/root/01studio/CollectibleKIT/
├── webapp-nextjs/           # Next.js frontend
├── bot/                     # Python Telegram bot
├── assets/                  # Static assets
├── docs/                    # Documentation
├── collectiblekit_bot.py    # Main bot file
└── requirements.txt         # Python dependencies
```

---

## 🔗 Expected URLs

Once deployed:
- Frontend: `https://collectiblekit.01studio.xyz`
- Bot: Running separately (can be configured)

---

## 📝 Next Steps

1. Wait for DNS propagation
2. Build the Next.js app: `cd webapp-nextjs && npm run build`
3. Create HTTPS server configuration
4. Deploy and start the service
5. Set up systemd service for 24/7 operation

---

## 🔧 Services Needed

This project has multiple components:
1. **Next.js Frontend** - Web app
2. **Python Bot** - Telegram bot (`collectiblekit_bot.py`)
3. **Database** - SQLite (may need setup)

All will need to be configured as systemd services for 24/7 operation.


