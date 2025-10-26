'use client';

import { useEffect } from 'react';
import { useUser } from '@/store/useAppStore';

export const MonetagSDK: React.FC = () => {
  const user = useUser();

  useEffect(() => {
    // ONLY load Monetag SDK for normal users AFTER they're logged in
    if (!user || !user.user_id || user.user_type !== 'normal') {
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src="//libtl.com/sdk.js"]');
    
    if (existingScript) {
      return; // Already loaded
    }

    // Load Monetag SDK (for rewarded interstitial - triggered manually after 3 games)
    const script = document.createElement('script');
    script.src = '//libtl.com/sdk.js';
    script.setAttribute('data-zone', '10065186');
    script.setAttribute('data-sdk', 'show_10065186');
    // NO data-auto attribute - we'll trigger ads manually after 3 games
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Monetag SDK loaded for rewarded interstitial');
    };
    
    document.head.appendChild(script);
  }, [user?.user_id, user?.user_type]);

  return null;
};
