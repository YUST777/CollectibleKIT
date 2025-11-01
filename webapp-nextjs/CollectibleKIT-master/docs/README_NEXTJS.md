# Story Canvas Cutter - Next.js App

A modern Telegram Mini App built with Next.js, TypeScript, and Tailwind CSS for transforming photos into puzzle stories.

## 🚀 Features

- **Story Puzzle Creation**: Upload photos and transform them into 12 story pieces
- **Gift Collection Designer**: Create custom gift combinations with different models and backdrops
- **Daily Game**: Guess the gift and win TON rewards
- **Task System**: Complete tasks to earn credits
- **TON Wallet Integration**: Connect wallet and withdraw rewards
- **Premium Features**: Custom watermarks for premium users

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Headless UI
- **State Management**: Zustand
- **Animations**: Framer Motion, Lottie
- **File Handling**: React Dropzone
- **Notifications**: React Hot Toast
- **Telegram Integration**: Telegram WebApp SDK

## 📦 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

## 🔧 Configuration

### Environment Variables

- `FLASK_API_URL`: URL of your Flask backend API
- `NEXT_PUBLIC_APP_URL`: Public URL of your Next.js app
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `TELEGRAM_WEBHOOK_URL`: Webhook URL for Telegram bot
- `TON_CONNECT_MANIFEST_URL`: TON Connect manifest URL
- `TELEGRAM_ANALYTICS_TOKEN`: Telegram Analytics token

### Telegram WebApp Setup

1. Create a Telegram bot using [@BotFather](https://t.me/BotFather)
2. Set up your bot's webhook
3. Configure the mini app in your bot's settings
4. Update the manifest URL in your environment variables

## 📱 Usage

### Development

1. Start your Flask backend server
2. Run `npm run dev` to start the Next.js development server
3. Open your Telegram bot and launch the mini app

### Production

1. Build the app with `npm run build`
2. Deploy to your hosting platform (Vercel, Netlify, etc.)
3. Update your Telegram bot's mini app URL
4. Configure your Flask API URL in environment variables

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── providers/        # Context providers
│   ├── tabs/             # Tab components
│   └── ui/               # UI components
├── lib/                  # Utility libraries
├── store/                # State management
└── types/                # TypeScript types
```

## 🎨 UI Components

- **Button**: Customizable button component with variants
- **Modal**: Accessible modal component with portal rendering
- **NavButton**: Navigation button with active states
- **LoadingScreen**: Animated loading screen with Lottie

## 🔌 API Integration

The app communicates with your Flask backend through API routes:

- `/api/process-image`: Process uploaded images
- `/api/upload-story-piece`: Upload story pieces for sharing
- `/api/game/daily-question`: Get daily game questions
- `/api/game/submit-answer`: Submit game answers
- `/api/withdraw-rewards`: Withdraw TON rewards

## 📱 Telegram Features

- **WebApp SDK**: Full integration with Telegram WebApp
- **Haptic Feedback**: Tactile feedback for user interactions
- **Theme Support**: Automatic theme detection and application
- **Story Sharing**: Direct sharing to Telegram stories
- **Analytics**: Built-in Telegram analytics tracking

## 🎯 Performance

- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Optimized images with Next.js Image component
- **Lazy Loading**: Lazy loading for better performance
- **Caching**: Intelligent caching strategies

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build and test
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Other Platforms

1. Build the app: `npm run build`
2. Deploy the `.next` folder and `public` folder
3. Configure environment variables
4. Set up your domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact:
- Telegram: [@TWETestBot](https://t.me/TWETestBot)
- Email: support@example.com

## 🔄 Migration from Vanilla JS

This Next.js app replaces the original vanilla HTML/CSS/JS implementation with:

- **Better Performance**: Server-side rendering and optimization
- **Type Safety**: Full TypeScript support
- **Component Reusability**: Modular React components
- **State Management**: Centralized state with Zustand
- **Better UX**: Consistent UI components and animations
- **Maintainability**: Clean code structure and patterns


