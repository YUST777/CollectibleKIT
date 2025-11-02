/**
 * Centralized API client for managing Telegram authentication headers
 */

import { getTelegramWebApp } from './telegram';

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Use improved detection function
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    console.error('❌ Telegram WebApp not available - cannot authenticate');
    console.error('❌ Window.Telegram:', typeof window !== 'undefined' ? (window as any).Telegram : 'N/A');
    console.error('❌ Window.tg:', typeof window !== 'undefined' ? (window as any).tg : 'N/A');
    console.error('❌ Make sure you opened this app from Telegram (Desktop/Web/Mobile)');
    return headers;
  }
  
  // Make sure WebApp is ready
  if (typeof webApp.ready === 'function') {
    webApp.ready();
  }
  
  // Try multiple ways to get initData
  let initData = webApp.initData || (webApp as any).initDataUnsafe?.raw || null;
  
  // Also check if initData is available directly on window (Desktop/Web sometimes exposes it differently)
  if (!initData && typeof window !== 'undefined') {
    const win = window as any;
    if (win.Telegram?.WebApp?.initData) {
      initData = win.Telegram.WebApp.initData;
    } else if (win.tg?.initData) {
      initData = win.tg.initData;
    }
  }
  
  if (initData && initData.length > 0) {
    headers['X-Telegram-Init-Data'] = initData;
    console.log('✅ initData found and added to headers, length:', initData.length);
    
    // Verify user data exists in initData
    try {
      const params = new URLSearchParams(initData);
      const userParam = params.get('user');
      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('✅ User authenticated:', {
          id: userData.id,
          username: userData.username,
          first_name: userData.first_name
        });
      } else {
        console.warn('⚠️ initData found but no user param - might be incomplete');
      }
    } catch (e) {
      console.warn('⚠️ Could not parse user from initData:', e);
    }
  } else {
    console.error('❌ initData is missing or empty!');
    console.error('❌ WebApp available:', !!webApp);
    console.error('❌ WebApp.initData:', webApp.initData);
    console.error('❌ WebApp.initDataUnsafe:', (webApp as any).initDataUnsafe);
    console.error('❌ This will cause authentication to fail. User must open app from Telegram.');
    console.error('❌ If you are in Telegram, try refreshing the page.');
  }
  
  return headers;
}

export function refreshTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  
  if (webApp && typeof webApp.ready === 'function') {
    webApp.ready();
  }
  
  // Force reinitialize if available
  if (webApp && typeof (webApp as any).init === 'function') {
    (webApp as any).init();
  }
  
  // Expand on desktop/web
  if (webApp && typeof webApp.expand === 'function') {
    webApp.expand();
  }
}

export function getInitData(): string | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;
  
  // Try multiple ways to get initData
  return webApp.initData || (webApp as any).initDataUnsafe?.raw || null;
}

export function isTelegramWebApp(): boolean {
  return !!getTelegramWebApp();
}

