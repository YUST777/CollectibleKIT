'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { TelegramWebApp } from '@/types';
import { initializeTelegramWebApp, trackTelegramAnalytics } from '@/lib/telegram';

interface TelegramContextType {
  webApp: TelegramWebApp | null;
  isReady: boolean;
  user: TelegramWebApp['initDataUnsafe']['user'] | null;
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  isReady: false,
  user: null,
});

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};

interface TelegramProviderProps {
  children: React.ReactNode;
}

export const TelegramProvider: React.FC<TelegramProviderProps> = ({ children }) => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user'] | null>(null);

  useEffect(() => {
    const initTelegram = () => {
      const tg = initializeTelegramWebApp();
      
      if (tg) {
        setWebApp(tg);
        setUser(tg.initDataUnsafe?.user || null);
        setIsReady(true);
        
        // Track app launch
        trackTelegramAnalytics('app_launch', {
          platform: tg.platform,
          version: tg.version,
          user_id: tg.initDataUnsafe?.user?.id,
        });
        
        // Set up event listeners
        tg.onEvent('viewportChanged', () => {
          // Handle viewport changes
          if (tg.viewportHeight) {
            document.documentElement.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
          }
        });
        
        tg.onEvent('themeChanged', () => {
          // Handle theme changes
          if (tg.themeParams) {
            const root = document.documentElement;
            Object.entries(tg.themeParams).forEach(([key, value]) => {
              if (value) {
                root.style.setProperty(`--tg-theme-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
              }
            });
          }
        });
        
        console.log('✅ Telegram WebApp provider initialized');
      } else {
        // Fallback for development
        console.log('🔄 Telegram WebApp not available, using fallback mode');
        setIsReady(true);
      }
    };

    // Initialize after component mounts
    const timer = setTimeout(initTelegram, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <TelegramContext.Provider value={{ webApp, isReady, user }}>
      {children}
    </TelegramContext.Provider>
  );
};




