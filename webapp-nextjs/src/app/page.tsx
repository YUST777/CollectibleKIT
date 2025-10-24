'use client';

import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MainApp } from '@/components/MainApp';
import { useTelegram } from '@/components/providers/TelegramProvider';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { isReady, user: telegramUser } = useTelegram();

  useEffect(() => {
    // Show loading screen until Telegram is ready
    if (isReady) {
      setIsLoading(false);
    }
    
    // Fallback: if not ready after 5 seconds, show app anyway
    const fallbackTimer = setTimeout(() => {
      console.log('⚠️ Fallback: Showing app without Telegram initialization');
      setIsLoading(false);
    }, 5000);
    
    return () => clearTimeout(fallbackTimer);
  }, [isReady]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <MainApp />;
}




