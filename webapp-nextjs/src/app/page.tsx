'use client';

import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MainApp } from '@/components/MainApp';
import { useTelegram } from '@/components/providers/TelegramProvider';

export default function Home() {
  // CRITICAL FIX: Show app IMMEDIATELY without any loading screen
  // The loading screen was causing the infinite loading issue
  
  return <MainApp />;
}




