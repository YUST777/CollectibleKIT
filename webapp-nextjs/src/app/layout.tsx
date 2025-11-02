import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TelegramProvider } from '@/components/providers/TelegramProvider';
import { TonConnectProvider } from '@/components/providers/TonConnectProvider';
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
        {/* Suppress noisy CloudStorage warnings in dev (outside Telegram) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var originalError = console.error;
                console.error = function(){
                  try {
                    var msg = arguments && arguments[0];
                    if (typeof msg === 'string' && msg.indexOf('CloudStorage is not supported') !== -1) {
                      return; // ignore this noisy warning in dev
                    }
                  } catch(e){}
                  return originalError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
        {/* Telegram WebApp SDK: Always load - Telegram will initialize it if available */}
        <script
          src="https://telegram.org/js/telegram-web-app.js"
        />
        {/* Dev: Polyfill missing CloudStorage to suppress console errors when running outside Telegram */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var tg = window.Telegram && window.Telegram.WebApp;
                  if (tg && !tg.CloudStorage) {
                    tg.CloudStorage = {
                      getItem: function(key, cb){ cb && cb(null); },
                      setItem: function(key, value, cb){ cb && cb(true); },
                      getItems: function(keys, cb){ cb && cb(null); },
                      removeItem: function(key, cb){ cb && cb(true); },
                      getKeys: function(cb){ cb && cb([]); }
                    };
                    console.warn('[Dev] Telegram.WebApp.CloudStorage polyfilled');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        
        {/* Lottie Player Web Component */}
        <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" />
        
        {/* Monetag SDK - Rewarded Interstitial Ads */}
        <script
          src="https://libtl.com/sdk.js"
          data-zone="10065186"
          data-sdk="show_10065186"
        />
        
        {/* Suppress Monetag/stat tag console errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var originalError = console.error;
                console.error = function(){
                  try {
                    var msg = arguments && arguments[0];
                    if (typeof msg === 'string' && (msg.indexOf('fleraprt.com') !== -1 || msg.indexOf('stattag.js') !== -1)) {
                      return; // ignore Monetag/stat tag errors
                    }
                  } catch(e){}
                  return originalError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
        
        {/* Telegram Analytics SDK */}
        <script
          async
          src="https://tganalytics.xyz/index.js"
          type="text/javascript"
        />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function initTelegramAnalytics() {
                try {
                  if (window.telegramAnalytics && typeof window.telegramAnalytics.init === 'function') {
                    window.telegramAnalytics.init({
                      token: 'eyJhcHBfbmFtZSI6ImNvbGxlY3RpYmxla2l0IiwiYXBwX3VybCI6Imh0dHBzOi8vdC5tZS9Db2xsZWN0aWJsZUtJVGJvdCIsImFwcF9kb21haW4iOiJodHRwczovL2NvbGxlY3RhYmxla2l0LjAxc3R1ZGlvLnh5ei8ifQ==!aODcv1DuHmG28etfMO7o0WiKyjdobSR8WcKrZuWKBBc=',
                      appName: 'collectiblekit',
                    });
                    console.log('✅ Telegram Analytics initialized');
                  } else {
                    console.warn('⚠️ Telegram Analytics not loaded yet, retrying in 2s...');
                    setTimeout(initTelegramAnalytics, 2000);
                  }
                } catch (error) {
                  console.warn('⚠️ Telegram Analytics initialization error:', error);
                  // Silently fail - analytics is optional
                }
              }
              
              // Wait for Telegram WebApp to be fully loaded before initializing
              function waitForTelegram() {
                if (window.Telegram && window.Telegram.WebApp) {
                  // Telegram is ready, initialize analytics after a delay
                  setTimeout(initTelegramAnalytics, 1000);
                } else {
                  setTimeout(waitForTelegram, 500);
                }
              }
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', waitForTelegram);
              } else {
                waitForTelegram();
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <TonConnectProvider>
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
        </TonConnectProvider>
      </body>
    </html>
  );
}
