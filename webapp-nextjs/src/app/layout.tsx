import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TelegramProvider } from '@/components/providers/TelegramProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CollectibleKIT',
  description: 'Create amazing stories with Telegram collectible gifts!',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1689ff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Telegram WebApp SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
        
        {/* Lottie Animation Library */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js" />
        
        {/* TON Connect UI */}
        <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js" />
        
        {/* Telegram Analytics SDK - Disabled until token is configured */}
        {/* Uncomment and add your token from https://t.me/TonBuilders_bot */}
        {/*
        <script
          async
          src="https://tganalytics.xyz/index.js"
          type="text/javascript"
        />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function initTelegramAnalytics() {
                if (window.telegramAnalytics && typeof window.telegramAnalytics.init === 'function') {
                  window.telegramAnalytics.init({
                    token: 'YOUR_TOKEN_FROM_TON_BUILDERS',
                    appName: 'collectiblekit',
                  });
                  console.log('✅ Telegram Analytics initialized');
                } else {
                  console.warn('⚠️ Telegram Analytics not loaded yet');
                  setTimeout(initTelegramAnalytics, 1000);
                }
              }
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initTelegramAnalytics);
              } else {
                initTelegramAnalytics();
              }
            `,
          }}
        />
        */}
      </head>
      <body className={inter.className}>
        <TelegramProvider>
          <div className="min-h-screen bg-bg-main text-text-idle">
            {children}
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--tg-theme-secondary-bg-color)',
                color: 'var(--tg-theme-text-color)',
                border: '1px solid var(--tg-theme-hint-color)',
              },
            }}
          />
        </TelegramProvider>
      </body>
    </html>
  );
}
