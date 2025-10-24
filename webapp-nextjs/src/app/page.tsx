'use client';

import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MainApp } from '@/components/MainApp';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const user = useAppStore(state => state.user);

  useEffect(() => {
    // Show loading screen until user is initialized
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <MainApp />;
}




