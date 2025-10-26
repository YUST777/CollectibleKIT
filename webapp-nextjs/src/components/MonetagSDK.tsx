'use client';

import { useEffect } from 'react';
import { useUser } from '@/store/useAppStore';

// TEMPORARY: DISABLE ALL ADS - They're blocking app initialization
const ADS_ENABLED = false;

export const MonetagSDK: React.FC = () => {
  const user = useUser();

  useEffect(() => {
    // TEMPORARILY DISABLED - Ads blocking app initialization
    if (!ADS_ENABLED) {
      console.log('🚫 Ads disabled - APP_ENABLED is false');
      return;
    }

    // CRITICAL: Only load SDK AFTER app is fully initialized
    // Wait a bit to ensure app is ready
    const loadSDKDelay = setTimeout(() => {
      // ONLY load Monetag SDK for normal users AFTER they're logged in
      if (!user || !user.user_id || user.user_type !== 'normal') {
        console.log('⏭️ Skipping Monetag SDK - user not ready or not normal user');
        return;
      }

      // Check if script is already loaded
      const existingScript = document.querySelector('script[src="//libtl.com/sdk.js"]');
      
      if (existingScript) {
        console.log('ℹ️ Monetag SDK already loaded');
        return; // Already loaded
      }

      console.log('⏳ Loading Monetag SDK for rewarded interstitial...');

      // Load Monetag SDK (for rewarded interstitial - triggered manually after 3 games)
      const script = document.createElement('script');
      script.src = '//libtl.com/sdk.js';
      script.setAttribute('data-zone', '10065186');
      script.setAttribute('data-sdk', 'show_10065186');
      // NO data-auto attribute - we'll trigger ads manually after 3 games
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Monetag SDK loaded successfully for rewarded interstitial');
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Monetag SDK');
      };
      
      document.head.appendChild(script);
    }, 3000); // Wait 3 seconds after user loads to ensure app is ready

    return () => clearTimeout(loadSDKDelay);
  }, [user?.user_id, user?.user_type]);

  return null;
};
