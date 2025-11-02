/**
 * Centralized API client for managing Telegram authentication headers
 */

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // Try to get initData from Telegram WebApp
  const webApp = (window as any).Telegram?.WebApp || (window as any).tg;
  const initData = webApp?.initData;
  
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
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

