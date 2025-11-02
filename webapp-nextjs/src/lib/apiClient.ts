/**
 * Centralized API client for managing Telegram authentication headers
 */

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Try to get initData from Telegram WebApp
  const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
  
  if (!webApp) {
    console.error('❌ Telegram WebApp not available - cannot authenticate');
    return headers;
  }
  
  // Make sure WebApp is ready
  if (typeof webApp.ready === 'function') {
    webApp.ready();
  }
  
  const initData = webApp.initData;
  
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
      }
    } catch (e) {
      console.warn('⚠️ Could not parse user from initData:', e);
    }
  } else {
    console.error('❌ initData is missing or empty! WebApp available:', !!webApp, 'initData:', initData);
    console.error('❌ This will cause authentication to fail. User must open app from Telegram.');
  }
  
  return headers;
}

export function refreshTelegramWebApp(): void {
  const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
  
  if (webApp && typeof webApp.ready === 'function') {
    webApp.ready();
  }
  
  // Force reinitialize if available
  if (webApp && typeof webApp.init === 'function') {
    webApp.init();
  }
}

export function getInitData(): string | null {
  const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
  return webApp?.initData || null;
}

export function isTelegramWebApp(): boolean {
  return !!(window as any).Telegram?.WebApp || !!(window as any).tg;
}

