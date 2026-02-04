'use client';

import { MainApp } from '@/components/MainApp';
import React, { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Show loading screen briefly, or until next tick for light boot feeling
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <LoadingScreen />;
  return <MainApp />;
}




