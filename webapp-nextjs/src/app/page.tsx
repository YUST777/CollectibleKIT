'use client';

import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MainApp } from '@/components/MainApp';
import { useTelegram } from '@/components/providers/TelegramProvider';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const { isReady, user: telegramUser } = useTelegram();

  useEffect(() => {
    // CRITICAL FIX: Show app immediately after short delay
    // Don't wait for Telegram.WebApp to prevent infinite loading
    
    console.log('📱 Initializing app...');
    
    // Quick timeout to show app ASAP (1 second max)
    const timer = setTimeout(() => {
      console.log('✅ App ready - showing MainApp');
      setIsLoading(false);
    }, 1000); // Reduced from 5000 to 1000ms
    
    return () => clearTimeout(timer);
  }, []); // No dependencies - just run once

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <MainApp />;
}




