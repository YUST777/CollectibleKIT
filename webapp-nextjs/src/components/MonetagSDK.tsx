'use client';

import { useEffect } from 'react';
import { useUser } from '@/store/useAppStore';

export const MonetagSDK: React.FC = () => {
  const user = useUser();

  useEffect(() => {
    // Wait 5 seconds after user logs in to ensure app is ready
    const loadSDKDelay = setTimeout(() => {
      // Only load for normal users or ad test user (7660176383)
      if (!user || !user.user_id) {
        return;
      }

      // Special ad test user
      const isAdTestUser = user.user_id === 7660176383;
      
      if (user.user_type !== 'normal' && !isAdTestUser) {
        console.log('⏭️ Skipping Monetag SDK - VIP/Premium user or not normal');
        return;
      }

      // Check if script is already loaded
      const existingScript = document.querySelector('script[src="//libtl.com/sdk.js"]');
      
      if (existingScript) {
        console.log('ℹ️ Monetag SDK already loaded');
        return;
      }

      console.log('⏳ Loading Monetag SDK for rewarded interstitial...');

      // Load Monetag SDK (Rewarded Interstitial - triggered after 3 games)
      const script = document.createElement('script');
      script.src = '//libtl.com/sdk.js';
      script.setAttribute('data-zone', '10065186');
      script.setAttribute('data-sdk', 'show_10065186');
      // NO data-auto - manual triggering only
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Monetag SDK loaded successfully for rewarded interstitial');
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Monetag SDK');
      };
      
      document.head.appendChild(script);
    }, 5000); // Wait 5 seconds to ensure app is fully loaded

    return () => clearTimeout(loadSDKDelay);
  }, [user?.user_id, user?.user_type]);

  return null;
};
