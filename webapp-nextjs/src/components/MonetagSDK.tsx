'use client';

import { useEffect } from 'react';
import { useUser } from '@/store/useAppStore';

export const MonetagSDK: React.FC = () => {
  const user = useUser();

  useEffect(() => {
    // Per Monetag docs: Wait for Telegram.WebApp.ready() BEFORE loading SDK
    // This prevents ads from blocking app initialization
    
    if (typeof window === 'undefined') return;
    
    const loadSDK = () => {
      // Only load for normal users or ad test user (7660176383)
      if (!user || !user.user_id) {
        return;
      }

      // Special ad test user
      const isAdTestUser = user.user_id === 7660176383;
      
      if (user.user_type !== 'normal' && !isAdTestUser) {
        console.log('⏭️ Skipping Monetag SDK - VIP/Premium user');
        return;
      }

      // Check if script is already loaded
      const existingScript = document.querySelector('script[src="//libtl.com/sdk.js"]');
      
      if (existingScript) {
        console.log('ℹ️ Monetag SDK already loaded');
        return;
      }

      console.log('⏳ Loading Monetag SDK (after Telegram.WebApp.ready())...');

      // Load Monetag SDK per docs: https://docs.monetag.com/docs/ad-integration
      const script = document.createElement('script');
      script.src = '//libtl.com/sdk.js';
      script.setAttribute('data-zone', '10065186');
      script.setAttribute('data-sdk', 'show_10065186');
      // NO data-auto - manual triggering only after 3 games
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Monetag SDK loaded - ready for manual triggering');
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Monetag SDK');
      };
      
      document.head.appendChild(script);
    };

    // Wait for Telegram.WebApp.ready() before loading SDK
    // This ensures proper UI positioning and prevents blocking
    if (window.Telegram?.WebApp) {
      console.log('📱 Waiting for Telegram.WebApp.ready()...');
      window.Telegram.WebApp.ready();
      
      // Load SDK after Telegram is ready (with delay to ensure app loads first)
      setTimeout(loadSDK, 3000);
    } else {
      console.log('⚠️ Telegram.WebApp not available, delaying SDK load');
      // Fallback: wait longer if Telegram SDK not available
      setTimeout(loadSDK, 5000);
    }
  }, [user?.user_id, user?.user_type]);

  return null;
};
