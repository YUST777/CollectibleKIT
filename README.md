# Gifts Toolkit - Telegram Mini App

A comprehensive Telegram Mini App for creating, managing, and sharing gift collections with story-based photo cutting features.

## 🚀 Features

### 🎨 **Collection Designer**
- Create custom gift collections with multiple models and patterns
- Beautiful backdrop colors and pattern overlays
- Grid-based collection layout (3x3 to 18x18)
- Save and load collections locally and publicly

### 📖 **Story Creator**
- Cut photos into 12 puzzle pieces
- Share individual pieces to Telegram Stories
- Create engaging story sequences
- Upload and process images with AI

### 🎮 **Mini Games**
- **Zoom Game**: Guess gift models from zoomed images
- **Emoji Game**: Match emojis with gift patterns
- Daily challenges and rewards

### 👤 **User Management**
- Telegram user integration
- Premium user features
- Referral system with rewards
- TON wallet integration

### 📊 **Analytics & Tasks**
- Track user engagement
- Complete tasks for rewards
- Public collection sharing
- Community features

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Python Flask, Node.js API routes
- **Database**: SQLite with custom schema
- **Integrations**: Telegram WebApp API, TON Connect
- **Deployment**: ngrok for development, ready for production

## 📁 Project Structure

```
├── webapp-nextjs/          # Next.js frontend application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   ├── lib/            # Utilities and helpers
│   │   └── types/          # TypeScript definitions
├── bot/                    # Python Telegram bot
│   ├── telegram_bot.py     # Main bot logic
│   ├── database.py         # Database operations
│   └── processing.py       # Image processing
├── docs/                   # Documentation files
└── assets/                 # Static assets and images
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Telegram Bot Token
- ngrok (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YUST777/Gifts-Toolkit.git
   cd Gifts-Toolkit
   ```

2. **Install frontend dependencies**
   ```bash
   cd webapp-nextjs
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp bot/config.example.py bot/config.py
   # Edit config.py with your bot token
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Start Next.js
   cd webapp-nextjs
   npm run dev
   
   # Terminal 2: Start Python bot
   python start_bot.py
   
   # Terminal 3: Start ngrok
   ngrok http 3003
   ```

6. **Access the app**
   - Frontend: http://localhost:3003
   - Public URL: https://your-ngrok-url.ngrok-free.app

## 🔧 Configuration

### Telegram Bot Setup
1. Create a bot with @BotFather
2. Get your bot token
3. Set webhook URL to your ngrok URL
4. Configure bot commands and description

### TON Wallet Integration
1. Get TON Connect manifest
2. Configure wallet settings
3. Test payment flows

## 📚 Documentation

All detailed documentation is available in the `/docs` folder:

- [Complete Implementation Guide](docs/COMPLETE_IMPLEMENTATION_GUIDE.md)
- [Gift Collection Features](docs/GIFT_COLLECTION_FEATURE.md)
- [Story Sharing Implementation](docs/STORY_SHARING_IMPLEMENTATION.md)
- [TON Wallet Setup](docs/TON_WALLET_SETUP.md)
- [Telegram Analytics Guide](docs/TELEGRAM_ANALYTICS_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Telegram WebApp API
- TON Foundation
- Next.js and React communities
- All contributors and testers

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: [Your Contact Information]

---

**Made with ❤️ for the Telegram community**


